const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/usuario.model");
const Escuela = require("../models/escuela.model");
const Membresia = require("../models/membresia.model");
const Invitacion = require("../models/invitacion-director.model");
const crypto = require("node:crypto");
const { validarCorreo } = require("../utils/usuario-validation");
const { schoolSecret, ISSUER, AUDIENCE } = require("../middleware/escuela-auth");

async function login(req, res, next) {
  try {
    const email = validarCorreo(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== "string" || !password || password.length > 1024) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }
    const user = await Usuario.findOne({ email }).select("+passwordHash nombre email estado tokenVersion");
    const fallback = "$2b$10$abcdefghijklmnopqrstuuumVOmx6XXzmxJKLsQlt7AASkPxMPEYW";
    const valid = await bcrypt.compare(password, user?.passwordHash || fallback);
    if (!user || user.estado !== "activo" || !valid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    const token = jwt.sign({ rol: "usuario", tv: user.tokenVersion }, schoolSecret(), {
      algorithm: "HS256", issuer: ISSUER, audience: AUDIENCE,
      subject: String(user._id), expiresIn: "1h"
    });
    return res.json({ token, expiresIn: 3600, usuario: { id: user._id, nombre: user.nombre, email: user.email } });
  } catch (error) {
    if (error.message.includes("SCHOOL_JWT_SECRET")) return res.status(503).json({ error: "Servicio no configurado" });
    return next(error);
  }
}

async function misEscuelas(req, res, next) {
  try {
    const memberships = await Membresia.find({
      usuario: req.escuelaUsuario.id, estado: "activa"
    }).select("escuela rol").lean();
    const allowed = memberships.map(m => m.escuela);
    const schools = await Escuela.find({ _id: { $in: allowed }, estado: "activa" })
      .select("nombre slug branding").lean();
    const roles = new Map();
    for (const m of memberships) {
      const id = String(m.escuela);
      roles.set(id, [...(roles.get(id) || []), m.rol]);
    }
    return res.json({ escuelas: schools.map(s => ({
      id: s._id, nombre: s.nombre, slug: s.slug, branding: s.branding,
      roles: roles.get(String(s._id)) || []
    })) });
  } catch (error) { return next(error); }
}

async function aceptarExistente(req, res, next) {
  const token = req.body?.token;
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
    return res.status(400).json({ error: "Invitación inválida" });
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const session = await require("mongoose").startSession();
  try {
    let escuelaId;
    await session.withTransaction(async () => {
      const invite = await Invitacion.findOneAndUpdate(
        { tokenHash, email: req.escuelaUsuario.email, usedAt: null,
          expiresAt: { $gt: new Date() } },
        { $set: { usedAt: new Date() } }, { new: true, session }
      );
      if (!invite) { const e = new Error("Invitación vencida, inválida o dirigida a otro correo"); e.status = 400; throw e; }
      const school = await Escuela.findOne({ _id: invite.escuela, estado: "activa" }).session(session);
      if (!school) { const e = new Error("Escuela no disponible"); e.status = 400; throw e; }
      await Membresia.create([{
        escuela: invite.escuela, usuario: req.escuelaUsuario.id, rol: "director", estado: "activa"
      }], { session });
      escuelaId = invite.escuela;
    });
    return res.json({ mensaje: "Escuela vinculada a tu cuenta", escuelaId });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "Ya perteneces a esta escuela" });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    return next(error);
  } finally { await session.endSession(); }
}

async function miEscuela(req, res) {
  const { escuela } = req.contextoEscuela;
  return res.json({ escuela: {
    id: escuela._id, nombre: escuela.nombre, slug: escuela.slug, branding: escuela.branding
  } });
}

module.exports = { login, misEscuelas, aceptarExistente, miEscuela };
