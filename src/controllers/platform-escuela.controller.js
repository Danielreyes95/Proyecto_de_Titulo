const mongoose = require("mongoose");
const Escuela = require("../models/escuela.model");
const {
  validateBranding, validateNewSchool, validateSchoolUpdate, validateSlug
} = require("../utils/escuela-validation");

function respondError(error, res, next) {
  if (error.status === 400) return res.status(400).json({ error: error.message });
  if (error.code === 11000) {
    return res.status(409).json({ error: "Ya existe una escuela con ese identificador" });
  }
  return next(error);
}

async function listar(req, res, next) {
  try {
    const escuelas = await Escuela.find()
      .select("nombre slug estado branding createdAt updatedAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ escuelas });
  } catch (error) { return next(error); }
}

async function crear(req, res, next) {
  try {
    const fields = validateNewSchool(req.body);
    const escuela = await Escuela.create(fields);
    return res.status(201).json({ escuela });
  } catch (error) { return respondError(error, res, next); }
}

async function actualizar(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    const fields = validateSchoolUpdate(req.body);
    const escuela = await Escuela.findByIdAndUpdate(
      req.params.id, { $set: fields }, { new: true, runValidators: true }
    ).select("nombre slug estado branding createdAt updatedAt");
    if (!escuela) return res.status(404).json({ error: "Escuela no encontrada" });
    return res.json({ escuela });
  } catch (error) { return respondError(error, res, next); }
}

async function actualizarBranding(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    const branding = validateBranding(req.body, req.params.id);
    if (!Object.keys(branding).length) {
      return res.status(400).json({ error: "No hay cambios" });
    }
    const fields = Object.fromEntries(
      Object.entries(branding).map(([key, value]) => [`branding.${key}`, value])
    );
    const escuela = await Escuela.findByIdAndUpdate(
      req.params.id, { $set: fields }, { new: true, runValidators: true }
    ).select("nombre slug estado branding");
    if (!escuela) return res.status(404).json({ error: "Escuela no encontrada" });
    return res.json({ escuela });
  } catch (error) { return respondError(error, res, next); }
}

async function marcaPublica(req, res, next) {
  try {
    const slug = validateSlug(req.params.slug);
    const escuela = await Escuela.findOne({ slug, estado: "activa" })
      .select("nombre slug branding").lean();
    if (!escuela) return res.status(404).json({ error: "Escuela no encontrada" });
    res.set("Cache-Control", "public, max-age=60");
    return res.json({
      nombre: escuela.nombre,
      slug: escuela.slug,
      branding: escuela.branding
    });
  } catch (error) { return respondError(error, res, next); }
}

module.exports = { listar, crear, actualizar, actualizarBranding, marcaPublica };
