const crypto = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const EscuelaEntrenador = require("../models/escuela-entrenador.model");
const Escuela = require("../models/escuela.model");
const Usuario = require("../models/usuario.model");
const Membresia = require("../models/membresia.model");
const Invitacion = require("../models/invitacion-entrenador.model");
const { validarNombre, validarPassword } = require("../utils/usuario-validation");

const hash = token => crypto.createHash("sha256").update(token).digest("hex");
const validToken = token => typeof token === "string" && /^[0-9a-f]{64}$/.test(token);

function invalid(res, error, next) {
  if (error.status === 400 || error.status === 409) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "La operación ya fue registrada" });
  }
  return next(error);
}
function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
async function invitar(req, res, next) {
  try {
    if (!/^[0-9a-f]{24}$/i.test(req.params.entrenadorId)) fail("Entrenador inválido");
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
        !process.env.FRONTEND_URL) {
      return res.status(503).json({ error: "Servicio de invitaciones no configurado" });
    }
    const escuela = req.contextoEscuela.escuela;
    const entrenador = await EscuelaEntrenador.findOne({
      _id: req.params.entrenadorId, escuela: escuela._id, estado: "activo"
    }).select("nombre email");
    if (!entrenador) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }
    const existing = await Usuario.findOne({ email: entrenador.email }).select("_id");
    if (existing) {
      const membership = await Membresia.exists({
        usuario: existing._id, escuela: escuela._id, rol: "entrenador"
      });
      if (membership) return res.status(409).json({
        error: "El entrenador ya tiene una membresía. Gestiona su estado antes de reenviar."
      });
    }
    const origin = new URL(process.env.FRONTEND_URL);
    if (!["http:", "https:"].includes(origin.protocol)) {
      return res.status(503).json({ error: "URL de invitación no configurada" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const invite = await Invitacion.create({
      escuela: escuela._id,
      entrenador: entrenador._id,
      email: entrenador.email,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      creadoPor: req.escuelaUsuario.id
    });
    const link = new URL("/activar-entrenador.html", origin);
    link.hash = new URLSearchParams({ token }).toString();
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER, to: entrenador.email,
        subject: "Invitación al equipo deportivo",
        text: `Has sido invitado/a a entrenar en ${escuela.nombre}. Activa tu acceso (válido 24 horas): ${link.toString()}\nSi no lo solicitaste, ignora este mensaje.`
      });
    } catch (_) {
      await Invitacion.deleteOne({ _id: invite._id, usedAt: null });
      return res.status(503).json({ error: "No fue posible enviar la invitación" });
    }
    return res.status(201).json({
      mensaje: "Invitación enviada", expiresAt: invite.expiresAt
    });
  } catch (error) { return invalid(res, error, next); }
}
async function consultar(req, res, next) {
  try {
    if (!validToken(req.query.token)) fail("Invitación inválida");
    const invitation = await Invitacion.findOne({
      tokenHash: hash(req.query.token),
      usedAt: null, expiresAt: { $gt: new Date() }
    }).populate("escuela", "nombre estado").populate("entrenador", "nombre email estado");
    if (!invitation || invitation.escuela?.estado !== "activa" ||
        invitation.entrenador?.estado !== "activo" ||
        invitation.email !== invitation.entrenador?.email) {
      return res.status(404).json({ error: "Invitación no disponible" });
    }
    const hasAccount = await Usuario.exists({ email: invitation.email });
    res.set("Cache-Control", "no-store");
    return res.json({
      escuela: { nombre: invitation.escuela.nombre },
      nombre: invitation.entrenador.nombre,
      email: invitation.email, requiereInicioSesion: Boolean(hasAccount)
    });
  } catch (error) { return invalid(res, error, next); }
}
async function aceptarNueva(req, res, next) {
  const { token, nombre, password } = req.body || {};
  if (!validToken(token) || !validarNombre(nombre) || !validarPassword(password)) {
    return res.status(400).json({ error: "Invitación, nombre o contraseña inválidos" });
  }
  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const invitation = await Invitacion.findOneAndUpdate({
        tokenHash: hash(token), usedAt: null, expiresAt: { $gt: new Date() }
      }, { $set: { usedAt: new Date() } }, { new: true, session });
      if (!invitation) fail("Invitación vencida o utilizada");
      const [school, coach, exists] = await Promise.all([
        Escuela.findOne({
          _id: invitation.escuela, estado: "activa"
        }).session(session).select("_id"),
        EscuelaEntrenador.findOne({
          _id: invitation.entrenador, escuela: invitation.escuela,
          email: invitation.email, estado: "activo"
        }).session(session).select("_id"),
        Usuario.exists({ email: invitation.email }).session(session)
      ]);
      if (!school || !coach) fail("Entrenador o escuela no disponible");
      if (exists) fail("Esta cuenta ya existe: inicia sesión para vincular la escuela", 409);
      const passwordHash = await bcrypt.hash(password, 12);
      const [user] = await Usuario.create([{
        nombre: validarNombre(nombre), email: invitation.email, passwordHash
      }], { session });
      await Membresia.create([{
        usuario: user._id, escuela: school._id, rol: "entrenador", estado: "activa"
      }], { session });
    });
    return res.status(201).json({ mensaje: "Acceso de entrenador creado" });
  } catch (error) { return invalid(res, error, next); }
  finally { if (session) await session.endSession(); }
}
async function aceptarExistente(req, res, next) {
  const token = req.body?.token;
  if (!validToken(token)) {
    return res.status(400).json({ error: "Invitación inválida" });
  }
  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const invitation = await Invitacion.findOneAndUpdate({
        tokenHash: hash(token), email: req.escuelaUsuario.email,
        usedAt: null, expiresAt: { $gt: new Date() }
      }, { $set: { usedAt: new Date() } }, { new: true, session });
      if (!invitation) fail("Invitación vencida o dirigida a otra cuenta");
      const [school, coach] = await Promise.all([
        Escuela.findOne({
          _id: invitation.escuela, estado: "activa"
        }).session(session).select("_id"),
        EscuelaEntrenador.findOne({
          _id: invitation.entrenador, escuela: invitation.escuela,
          email: invitation.email, estado: "activo"
        }).session(session).select("_id")
      ]);
      if (!school || !coach) fail("Entrenador o escuela no disponible");
      await Membresia.create([{
        usuario: req.escuelaUsuario.id, escuela: school._id,
        rol: "entrenador", estado: "activa"
      }], { session });
    });
    return res.json({ mensaje: "Escuela vinculada como entrenador" });
  } catch (error) { return invalid(res, error, next); }
  finally { if (session) await session.endSession(); }
}
module.exports = { invitar, consultar, aceptarNueva, aceptarExistente };
