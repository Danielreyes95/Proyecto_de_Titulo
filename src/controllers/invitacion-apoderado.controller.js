const crypto = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const Escuela = require("../models/escuela.model");
const EscuelaApoderado = require("../models/escuela-apoderado.model");
const Usuario = require("../models/usuario.model");
const Membresia = require("../models/membresia.model");
const Invitacion = require("../models/invitacion-apoderado.model");
const { validarNombre, validarPassword } = require("../utils/usuario-validation");

const validToken = token => typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
const digest = token => crypto.createHash("sha256").update(token).digest("hex");

function fail(message, status = 400) {
  const e = new Error(message); e.status = status; throw e;
}
function respond(error, res, next) {
  if (error.status === 400 || error.status === 409) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "Cuenta o vínculo ya registrado" });
  }
  return next(error);
}
async function invitar(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.apoderadoId)) fail("Apoderado inválido");
    const { escuela } = req.contextoEscuela;
    const contacto = await EscuelaApoderado.findOne({
      escuela: escuela._id, _id: req.params.apoderadoId, estado: "activo"
    }).select("nombre email usuario");
    if (!contacto) return res.status(404).json({ error: "Apoderado no encontrado" });
    if (contacto.usuario) return res.status(409).json({ error: "El apoderado ya activó su cuenta" });
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.FRONTEND_URL) {
      return res.status(503).json({ error: "Servicio de invitación no configurado" });
    }
    const origin = new URL(process.env.FRONTEND_URL);
    if (!["http:", "https:"].includes(origin.protocol)) {
      return res.status(503).json({ error: "URL de invitación inválida" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const invitation = await Invitacion.create({
      escuela: escuela._id, apoderado: contacto._id, email: contacto.email,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      creadoPor: req.escuelaUsuario.id
    });
    const link = new URL("/activar-apoderado.html", origin);
    link.hash = new URLSearchParams({ token }).toString();
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: contacto.email,
        subject: "Invitación al portal de familias",
        text: `Te invitamos al portal de familias de ${escuela.nombre}. Enlace válido por 24 horas: ${link.toString()}\nSi no esperabas este correo, puedes ignorarlo.`
      });
    } catch (_) {
      await Invitacion.deleteOne({ _id: invitation._id, usedAt: null });
      return res.status(503).json({ error: "No se pudo entregar la invitación" });
    }
    return res.status(201).json({
      mensaje: "Invitación enviada al correo registrado", expiresAt: invitation.expiresAt
    });
  } catch (error) { return respond(error, res, next); }
}
async function consultar(req, res, next) {
  try {
    if (!validToken(req.query.token)) fail("Invitación inválida");
    const invitation = await Invitacion.findOne({
      tokenHash: digest(req.query.token), usedAt: null, expiresAt: { $gt: new Date() }
    }).populate("escuela", "nombre estado branding")
      .populate("apoderado", "nombre email estado usuario");
    if (!invitation || invitation.escuela?.estado !== "activa" ||
        invitation.apoderado?.estado !== "activo" ||
        invitation.apoderado?.usuario ||
        invitation.apoderado?.email !== invitation.email) {
      return res.status(404).json({ error: "Invitación vencida o no disponible" });
    }
    const exists = await Usuario.exists({ email: invitation.email });
    return res.json({
      escuela: { nombre: invitation.escuela.nombre, branding: invitation.escuela.branding },
      nombre: invitation.apoderado.nombre,
      email: invitation.email,
      requiereInicioSesion: Boolean(exists)
    });
  } catch (error) { return respond(error, res, next); }
}
async function accept(req, res, next, existingUser) {
  const { token, nombre, password } = req.body || {};
  if (!validToken(token)) return res.status(400).json({ error: "Invitación inválida" });
  if (!existingUser && (!validarNombre(nombre) || !validarPassword(password))) {
    return res.status(400).json({ error: "Nombre o contraseña inválidos (mínimo 12 caracteres)" });
  }
  let session;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const filter = {
        tokenHash: digest(token), usedAt: null, expiresAt: { $gt: new Date() }
      };
      if (existingUser) filter.email = req.escuelaUsuario.email;
      const invitation = await Invitacion.findOneAndUpdate(
        filter, { $set: { usedAt: new Date() } }, { new: true, session }
      );
      if (!invitation) fail("Invitación vencida, utilizada o dirigida a otra cuenta");
      const [school, contacto] = await Promise.all([
        Escuela.findOne({
          _id: invitation.escuela, estado: "activa"
        }).session(session).select("_id"),
        EscuelaApoderado.findOne({
          _id: invitation.apoderado, escuela: invitation.escuela,
          email: invitation.email, estado: "activo", usuario: null
        }).session(session).select("_id email")
      ]);
      if (!school || !contacto) fail("Escuela o apoderado no disponible");
      let userId;
      if (existingUser) {
        userId = req.escuelaUsuario.id;
      } else {
        const exists = await Usuario.exists({ email: invitation.email }).session(session);
        if (exists) fail("La cuenta ya existe: inicia sesión y acepta con ese correo", 409);
        const [created] = await Usuario.create([{
          email: invitation.email, nombre: validarNombre(nombre),
          passwordHash: await bcrypt.hash(password, 12)
        }], { session });
        userId = created._id;
      }
      const link = await EscuelaApoderado.updateOne({
        _id: contacto._id, escuela: school._id,
        email: invitation.email, estado: "activo", usuario: null
      }, { $set: { usuario: userId } }, { session, runValidators: true });
      if (link.modifiedCount !== 1) fail("La cuenta ya fue vinculada", 409);
      await Membresia.create([{
        escuela: school._id, usuario: userId, rol: "apoderado", estado: "activa"
      }], { session });
    });
    return res.json({ mensaje: "Cuenta de familia vinculada. Ya puedes iniciar sesión." });
  } catch (error) { return respond(error, res, next); }
  finally { if (session) await session.endSession(); }
}
async function aceptarNuevo(req, res, next) { return accept(req, res, next, false); }
async function aceptarExistente(req, res, next) { return accept(req, res, next, true); }
module.exports = { invitar, consultar, aceptarNuevo, aceptarExistente };
