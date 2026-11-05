const mongoose = require("mongoose");
const Escuela = require("../models/escuela.model");
const Membresia = require("../models/membresia.model");
const EscuelaApoderado = require("../models/escuela-apoderado.model");

// El ID de escuela de la URL no otorga derechos. Se exige membresía activa
// y ficha del apoderado activa vinculada a la identidad autenticada.
async function requireFamilia(req, res, next) {
  try {
    const escuelaId = req.params.escuelaId;
    if (!mongoose.isValidObjectId(escuelaId) || !req.escuelaUsuario) {
      return res.status(400).json({ error: "Escuela inválida" });
    }
    const [escuela, membresia, apoderado] = await Promise.all([
      Escuela.findOne({ _id: escuelaId, estado: "activa" })
        .select("nombre slug branding"),
      Membresia.findOne({
        escuela: escuelaId, usuario: req.escuelaUsuario.id,
        rol: "apoderado", estado: "activa"
      }).select("_id"),
      EscuelaApoderado.findOne({
        escuela: escuelaId, usuario: req.escuelaUsuario.id,
        email: req.escuelaUsuario.email, estado: "activo"
      }).select("_id nombre")
    ]);
    if (!escuela || !membresia || !apoderado) {
      return res.status(404).json({ error: "Escuela no disponible" });
    }
    req.familia = { escuela, apoderado };
    return next();
  } catch (error) { return next(error); }
}
module.exports = { requireFamilia };
