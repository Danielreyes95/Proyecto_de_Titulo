const mongoose = require("mongoose");
const EscuelaEntrenador = require("../models/escuela-entrenador.model");
const EscuelaCategoria = require("../models/escuela-categoria.model");
const AsignacionEntrenador = require("../models/asignacion-entrenador.model");
const { validarEntrenador, validarAsignacion } =
  require("../utils/entrenador-escuela-validation");

function escuelaId(req) {
  return req.contextoEscuela.escuela._id;
}

function errorResponse(error, res, next) {
  if (error.status === 400 || error.name === "ValidationError") {
    return res.status(400).json({
      error: error.status === 400 ? error.message : "Datos inválidos"
    });
  }
  if (error.code === 11000) {
    return res.status(409).json({
      error: "Ya existe el entrenador o la categoría tiene un responsable asignado"
    });
  }
  if (error.name === "VersionError") {
    return res.status(409).json({ error: "Registro modificado. Actualiza y vuelve a intentar." });
  }
  return next(error);
}

function validId(id) {
  return typeof id === "string" && /^[0-9a-f]{24}$/i.test(id);
}

async function listar(req, res, next) {
  try {
    const escuela = escuelaId(req);
    const [entrenadores, asignaciones] = await Promise.all([
      EscuelaEntrenador.find({ escuela })
        .select("nombre email estado createdAt").sort({ nombre: 1 }).limit(150).lean(),
      AsignacionEntrenador.find({ escuela, estado: "activa" })
        .select("entrenador categoria")
        .populate({
          path: "categoria",
          select: "nombre modalidad estado",
          match: { escuela }
        }).lean()
    ]);
    const porEntrenador = new Map();
    for (const asignacion of asignaciones) {
      if (!asignacion.categoria) continue;
      const id = String(asignacion.entrenador);
      porEntrenador.set(id, [
        ...(porEntrenador.get(id) || []),
        asignacion.categoria
      ]);
    }
    return res.json({
      entrenadores: entrenadores.map(entrenador => ({
        ...entrenador, categorias: porEntrenador.get(String(entrenador._id)) || []
      }))
    });
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const fields = validarEntrenador(req.body, true);
    const entrenador = await EscuelaEntrenador.create({
      ...fields, escuela: escuelaId(req)
    });
    return res.status(201).json({ entrenador });
  } catch (error) { return errorResponse(error, res, next); }
}

async function actualizar(req, res, next) {
  try {
    if (!validId(req.params.entrenadorId)) {
      return res.status(400).json({ error: "Entrenador inválido" });
    }
    const fields = validarEntrenador(req.body);
    const entrenador = await EscuelaEntrenador.findOne({
      _id: req.params.entrenadorId, escuela: escuelaId(req)
    });
    if (!entrenador) return res.status(404).json({ error: "Entrenador no encontrado" });
    Object.assign(entrenador, fields);
    await entrenador.save();
    return res.json({ entrenador });
  } catch (error) { return errorResponse(error, res, next); }
}

async function asignar(req, res, next) {
  try {
    if (!validId(req.params.entrenadorId)) {
      return res.status(400).json({ error: "Entrenador inválido" });
    }
    const categoriaId = validarAsignacion(req.body);
    const escuela = escuelaId(req);
    const [entrenador, categoria] = await Promise.all([
      EscuelaEntrenador.findOne({
        _id: req.params.entrenadorId, escuela, estado: "activo"
      }).select("_id"),
      EscuelaCategoria.findOne({
        _id: categoriaId, escuela, estado: "activa"
      }).select("_id")
    ]);
    // Evitar confirmar si existe un recurso ajeno a esta escuela.
    if (!entrenador || !categoria) {
      return res.status(404).json({ error: "Entrenador o categoría no disponible" });
    }
    const asignacion = await AsignacionEntrenador.create({
      escuela, entrenador: entrenador._id, categoria: categoria._id
    });
    return res.status(201).json({ asignacion });
  } catch (error) { return errorResponse(error, res, next); }
}

async function finalizarAsignacion(req, res, next) {
  try {
    if (!validId(req.params.entrenadorId) || !validId(req.params.categoriaId)) {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    const asignacion = await AsignacionEntrenador.findOneAndUpdate({
      escuela: escuelaId(req),
      entrenador: req.params.entrenadorId,
      categoria: req.params.categoriaId,
      estado: "activa"
    }, { $set: { estado: "finalizada", fechaFin: new Date() } },
    { new: true, runValidators: true });
    if (!asignacion) return res.status(404).json({
      error: "Asignación activa no encontrada"
    });
    return res.json({ mensaje: "Asignación finalizada" });
  } catch (error) { return errorResponse(error, res, next); }
}

module.exports = { listar, crear, actualizar, asignar, finalizarAsignacion };
