const mongoose = require("mongoose");
const Escuela = require("../models/escuela.model");
const Membresia = require("../models/membresia.model");
const EscuelaEntrenador = require("../models/escuela-entrenador.model");
const Asignacion = require("../models/asignacion-entrenador.model");

// Válido tanto para director como para entrenador con membresía activa y
// asignación de categoría confirmada; nunca basta declarar rol en cliente.
async function requirePersonalDeportivo(req, res, next) {
  try {
    const escuelaId = req.params.escuelaId;
    if (!mongoose.isValidObjectId(escuelaId) || !req.escuelaUsuario) {
      return res.status(400).json({ error: "Escuela inválida" });
    }
    const escuela = await Escuela.findOne({ _id: escuelaId, estado: "activa" })
      .select("nombre slug branding");
    if (!escuela) return res.status(404).json({ error: "Escuela no encontrada" });
    const memberships = await Membresia.find({
      escuela: escuela._id,
      usuario: req.escuelaUsuario.id,
      rol: { $in: ["director", "entrenador"] },
      estado: "activa"
    }).select("rol");
    if (!memberships.length) return res.status(404).json({ error: "Escuela no encontrada" });

    const isDirector = memberships.some(m => m.rol === "director");
    if (isDirector) {
      req.deporteScope = { escuela, rol: "director", categorias: null };
      return next();
    }

    // Una membresía de entrenador NO basta sin registro de personal activo
    // y asignaciones activas en esta misma escuela.
    const entrenador = await EscuelaEntrenador.findOne({
      escuela: escuela._id, email: req.escuelaUsuario.email, estado: "activo"
    }).select("_id nombre");
    if (!entrenador) return res.status(403).json({ error: "Sin asignación activa" });
    const asignaciones = await Asignacion.find({
      escuela: escuela._id, entrenador: entrenador._id, estado: "activa"
    }).select("categoria").lean();
    if (!asignaciones.length) return res.status(403).json({ error: "Sin asignación activa" });
    req.deporteScope = {
      escuela, rol: "entrenador", entrenador: entrenador._id,
      categorias: asignaciones.map(a => String(a.categoria))
    };
    return next();
  } catch (error) { return next(error); }
}

function puedeVerCategoria(req, categoriaId) {
  return req.deporteScope?.rol === "director" ||
    req.deporteScope?.categorias?.includes(String(categoriaId));
}

module.exports = { requirePersonalDeportivo, puedeVerCategoria };
