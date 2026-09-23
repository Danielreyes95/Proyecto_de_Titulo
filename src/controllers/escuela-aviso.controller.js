const mongoose = require("mongoose");
const Aviso = require("../models/escuela-aviso.model");
const Categoria = require("../models/escuela-categoria.model");
const { validarAviso } = require("../utils/aviso-escuela-validation");

function errorResponse(error, res, next) {
  if (error.status === 400 || error.name === "ValidationError") {
    return res.status(400).json({
      error: error.status === 400 ? error.message : "Datos de aviso inválidos"
    });
  }
  if (error.name === "VersionError") {
    return res.status(409).json({ error: "El aviso cambió. Actualiza y reintenta." });
  }
  return next(error);
}

async function listar(req, res, next) {
  try {
    const avisos = await Aviso.find({
      escuela: req.contextoEscuela.escuela._id
    }).select("titulo mensaje categoria estado publicadoEn createdAt")
      .sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ avisos });
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const data = validarAviso(req.body);
    const escuela = req.contextoEscuela.escuela._id;
    if (data.categoriaId) {
      const exists = await Categoria.exists({
        _id: data.categoriaId, escuela, estado: "activa"
      });
      if (!exists) {
        return res.status(404).json({ error: "Categoría no disponible" });
      }
    }
    const aviso = await Aviso.create({
      escuela,
      categoria: data.categoriaId,
      titulo: data.titulo,
      mensaje: data.mensaje,
      estado: data.publicar ? "publicado" : "borrador",
      publicadoEn: data.publicar ? new Date() : null,
      creadoPor: req.escuelaUsuario.id
    });
    return res.status(201).json({ aviso });
  } catch (error) { return errorResponse(error, res, next); }
}

async function cambiarEstado(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.avisoId)) {
      return res.status(400).json({ error: "Aviso inválido" });
    }
    if (!req.body || typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length !== 1 ||
        !["publicado", "archivado"].includes(req.body.estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }
    const aviso = await Aviso.findOne({
      _id: req.params.avisoId, escuela: req.contextoEscuela.escuela._id
    });
    if (!aviso) return res.status(404).json({ error: "Aviso no encontrado" });
    if (aviso.estado === "archivado") {
      return res.status(409).json({ error: "Un aviso archivado no puede republicarse" });
    }
    if (aviso.estado === req.body.estado) return res.json({ aviso });
    if (req.body.estado === "publicado") {
      if (aviso.categoria) {
        const category = await Categoria.exists({
          _id: aviso.categoria, escuela: req.contextoEscuela.escuela._id,
          estado: "activa"
        });
        if (!category) {
          return res.status(409).json({
            error: "La categoría ya no está activa. No es posible publicar este aviso."
          });
        }
      }
      aviso.publicadoEn = new Date();
    }
    aviso.estado = req.body.estado;
    await aviso.save();
    return res.json({ aviso });
  } catch (error) { return errorResponse(error, res, next); }
}
module.exports = { listar, crear, cambiarEstado };
