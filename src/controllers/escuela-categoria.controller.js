const mongoose = require("mongoose");
const EscuelaCategoria = require("../models/escuela-categoria.model");
const { validarCampos, validarRangoFinal } = require("../utils/categoria-escuela-validation");

function errorResponse(error, res, next) {
  if (error.status === 400 || error.name === "ValidationError") {
    return res.status(400).json({ error: error.status === 400 ? error.message : "Datos de categoría inválidos" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "Ya existe esta categoría y modalidad en la escuela" });
  }
  return next(error);
}

function tenant(req) {
  // Derivado únicamente de una membresía y escuela validadas en middleware.
  return req.contextoEscuela.escuela._id;
}

async function listar(req, res, next) {
  try {
    const categorias = await EscuelaCategoria.find({ escuela: tenant(req) })
      .select("nombre modalidad edadMin edadMax cupos estado createdAt")
      .sort({ edadMin: 1, nombre: 1, modalidad: 1 })
      .limit(100)
      .lean();
    return res.json({ categorias });
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const fields = validarCampos(req.body, true);
    const categoria = await EscuelaCategoria.create({ ...fields, escuela: tenant(req) });
    return res.status(201).json({ categoria });
  } catch (error) { return errorResponse(error, res, next); }
}

async function actualizar(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.categoriaId)) {
      return res.status(400).json({ error: "Categoría inválida" });
    }
    const cambios = validarCampos(req.body);
    const filtro = { _id: req.params.categoriaId, escuela: tenant(req) };
    const actual = await EscuelaCategoria.findOne(filtro).lean();
    if (!actual) return res.status(404).json({ error: "Categoría no encontrada" });
    validarRangoFinal(actual, cambios);

    const categoria = await EscuelaCategoria.findOneAndUpdate(filtro,
      { $set: cambios }, { new: true, runValidators: true })
      .select("nombre modalidad edadMin edadMax cupos estado");
    if (!categoria) return res.status(404).json({ error: "Categoría no encontrada" });
    return res.json({ categoria });
  } catch (error) { return errorResponse(error, res, next); }
}

module.exports = { listar, crear, actualizar };
