const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Usuario = require("../models/usuario.model");
const Membresia = require("../models/membresia.model");
const Escuela = require("../models/escuela.model");

const ISSUER = "escuela-plataforma";
const AUDIENCE = "escuela-usuario";

function schoolSecret() {
  const secret = process.env.SCHOOL_JWT_SECRET;
  if (!secret || secret.length < 32 ||
      secret === process.env.JWT_SECRET ||
      secret === process.env.PLATFORM_JWT_SECRET) {
    throw new Error("SCHOOL_JWT_SECRET único (mínimo 32 caracteres) es obligatorio");
  }
  return secret;
}

async function requireSchoolUser(req, res, next) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get("authorization") || "");
  if (!match) return res.status(401).json({ error: "Debes iniciar sesión" });
  let payload;
  try {
    payload = jwt.verify(match[1], schoolSecret(), {
      algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE
    });
    if (payload.rol !== "usuario" || !mongoose.isValidObjectId(payload.sub)) {
      return res.status(401).json({ error: "Sesión inválida" });
    }
  } catch (error) {
    if (error.message.includes("SCHOOL_JWT_SECRET")) {
      return res.status(503).json({ error: "Acceso a escuela no configurado" });
    }
    return res.status(401).json({ error: "Sesión inválida" });
  }

  try {
    const usuario = await Usuario.findById(payload.sub).select("nombre email estado tokenVersion");
    if (!usuario || usuario.estado !== "activo" || payload.tv !== usuario.tokenVersion) {
      return res.status(401).json({ error: "Sesión inválida" });
    }
    req.escuelaUsuario = { id: usuario._id, nombre: usuario.nombre, email: usuario.email };
    next();
  } catch (error) { next(error); }
}

async function requireDirector(req, res, next) {
  try {
    const escuelaId = req.params.escuelaId;
    if (!mongoose.isValidObjectId(escuelaId)) {
      return res.status(400).json({ error: "Escuela inválida" });
    }

    const membresia = await Membresia.findOne({
      escuela: escuelaId, usuario: req.escuelaUsuario.id,
      rol: "director", estado: "activa"
    });
    if (!membresia) return res.status(404).json({ error: "Escuela no encontrada" });

    const escuela = await Escuela.findOne({ _id: escuelaId, estado: "activa" });
    if (!escuela) return res.status(404).json({ error: "Escuela no encontrada" });

    req.contextoEscuela = { escuela, membresia };
    next();
  } catch (error) { next(error); }
}

module.exports = { schoolSecret, requireSchoolUser, requireDirector, ISSUER, AUDIENCE };
