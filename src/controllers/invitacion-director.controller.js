const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Escuela = require("../models/escuela.model");
const Usuario = require("../models/usuario.model");
const Membresia = require("../models/membresia.model");
const Invitacion = require("../models/invitacion-director.model");
const { validarCorreo, validarNombre, validarPassword } = require("../utils/usuario-validation");

const hashToken = token => crypto.createHash("sha256").update(token).digest("hex");

function smtpReady() {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.FRONTEND_URL);
}
function validToken(token) {
  return typeof token === "string" && /^[0-9a-f]{64}$/.test(token);
}
function respondValidation(res, error) {
  if (error?.code === 11000) return res.status(409).json({ error: "La operación ya fue registrada" });
  if (error?.status === 400) return res.status(400).json({ error: error.message });
  return null;
}

async function invitar(req, res, next) {
  const { escuelaId } = req.params;
  if (!mongoose.isValidObjectId(escuelaId)) return res.status(400).json({ error: "Escuela inválida" });
  const email = validarCorreo(req.body?.email);
  const nombre = validarNombre(req.body?.nombre);
  if (!email || !nombre || Object.keys(req.body).some(k => !["email", "nombre"].includes(k))) {
    return res.status(400).json({ error: "Nombre y correo válidos son obligatorios" });
  }
  if (!smtpReady()) return res.status(503).json({ error: "Configura el servicio de correo antes de invitar" });

  try {
    const escuela = await Escuela.findOne({ _id: escuelaId, estado: "activa" });
    if (!escuela) return res.status(404).json({ error: "Escuela no encontrada o inactiva" });
    const user = await Usuario.findOne({ email });
    if (user) {
      const membership = await Membresia.findOne({ escuela: escuelaId, usuario: user._id, rol: "director" });
      if (membership) return res.status(409).json({ error: "Ese usuario ya pertenece a la escuela como director" });
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const invitation = await Invitacion.create({
      escuela: escuelaId, email, nombre, tokenHash: hashToken(secret),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      creadoPor: req.platformAdmin.id
    });
    const origin = new URL(process.env.FRONTEND_URL);
    if (!["http:", "https:"].includes(origin.protocol)) throw new Error("FRONTEND_URL inválida");
    const link = new URL("/activar-director.html", origin);
    link.hash = new URLSearchParams({ token: secret }).toString();

    try {
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transport.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Invitación a dirigir una escuela",
        text: `Has sido invitado/a a dirigir ${escuela.nombre}. Abre el enlace para aceptar la invitación (válido 24 horas): ${link.toString()}\nSi no solicitaste esto, ignora el mensaje.`
      });
    } catch (error) {
      await Invitacion.deleteOne({ _id: invitation._id, usedAt: null });
      console.error("No se pudo entregar invitación", error.message);
      return res.status(503).json({ error: "No fue posible enviar la invitación por correo" });
    }

    return res.status(201).json({ mensaje: "Invitación enviada al correo", expiresAt: invitation.expiresAt });
  } catch (error) {
    return respondValidation(res, error) || next(error);
  }
}

async function consultar(req, res, next) {
  try {
    const { token } = req.query;
    if (!validToken(token)) return res.status(400).json({ error: "Invitación inválida" });
    const invite = await Invitacion.findOne({
      tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() }
    }).populate("escuela", "nombre estado branding");
    if (!invite || invite.escuela?.estado !== "activa") {
      return res.status(404).json({ error: "Invitación vencida o inválida" });
    }
    const existing = await Usuario.exists({ email: invite.email });
    return res.json({
      nombre: invite.nombre, email: invite.email,
      escuela: { nombre: invite.escuela.nombre, branding: invite.escuela.branding },
      requiereInicioSesion: Boolean(existing)
    });
  } catch (error) { return next(error); }
}

// Uso único, con transacción: requiere MongoDB replica set / Atlas.
// Invitación existente: requiere sesión de la cuenta INVITADA.
// Invitación nueva: crea identidad tras validar contraseña.
async function aceptar(req, res, next) {
  const { token, nombre, password } = req.body || {};
  if (!validToken(token)) return res.status(400).json({ error: "Invitación inválida" });
  if (typeof password !== "string" || !validarPassword(password) || !validarNombre(nombre)) {
    return res.status(400).json({ error: "Nombre o contraseña inválidos (mínimo 12 caracteres)" });
  }
  const session = await mongoose.startSession();
  try {
    let escuelaId;
    await session.withTransaction(async () => {
      const invite = await Invitacion.findOneAndUpdate(
        { tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { usedAt: new Date() } },
        { new: true, session }
      );
      if (!invite) { const err = new Error("Invitación vencida o utilizada"); err.status = 400; throw err; }
      const school = await Escuela.findOne({ _id: invite.escuela, estado: "activa" }).session(session);
      if (!school) { const err = new Error("Escuela no disponible"); err.status = 400; throw err; }
      if (await Usuario.exists({ email: invite.email }).session(session)) {
        const err = new Error("La cuenta ya existe: inicia sesión para vincular esta escuela");
        err.status = 409;
        throw err;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const [user] = await Usuario.create([{
        nombre: validarNombre(nombre), email: invite.email, passwordHash, estado: "activo"
      }], { session });
      await Membresia.create([{
        escuela: invite.escuela, usuario: user._id, rol: "director", estado: "activa"
      }], { session });
      escuelaId = invite.escuela;
    });
    return res.status(201).json({ mensaje: "Cuenta de director activada. Inicia sesión.", escuelaId });
  } catch (error) {
    return respondValidation(res, error) || next(error);
  } finally { await session.endSession(); }
}

module.exports = { invitar, consultar, aceptar };
