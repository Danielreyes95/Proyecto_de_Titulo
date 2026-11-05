const mongoose = require("mongoose");
const Vinculo = require("../models/vinculo-jugador-apoderado.model");
const Jugador = require("../models/escuela-jugador.model");
const Evento = require("../models/escuela-evento.model");
const { fechaHoyEscuela } = require("../utils/familia-fechas");
const { validarConfirmacion } = require("../utils/confirmacion-actividad-validation");

// La intención comunicada por la familia NO altera la asistencia observada
// por el entrenador. Se verifica pertenencia en servidor en cada escritura.
async function confirmar(req, res, next) {
  try {
    const { eventoId, jugadorId } = req.params;
    if (!mongoose.isValidObjectId(eventoId) || !mongoose.isValidObjectId(jugadorId)) {
      return res.status(400).json({ error: "Identificador inválido" });
    }
    const estado = validarConfirmacion(req.body);
    const escuela = req.familia.escuela._id;
    const jugador = await Jugador.findOne({
      _id: jugadorId, escuela, estado: "activo"
    }).select("_id categoria");
    if (!jugador) return res.status(404).json({ error: "Actividad o jugador no disponible" });
    const vinculo = await Vinculo.exists({
      escuela, jugador: jugador._id,
      apoderado: req.familia.apoderado._id, estado: "activo"
    });
    if (!vinculo) return res.status(404).json({ error: "Actividad o jugador no disponible" });

    // La actualización atómica restringe escuela, actividad abierta/futura,
    // categoría ACTUAL y ficha del jugador existente en esta actividad.
    const resultado = await Evento.findOneAndUpdate({
      _id: eventoId, escuela, cerrado: false,
      fechaEvento: { $gte: fechaHoyEscuela() },
      categoria: jugador.categoria,
      "registros.jugador": jugador._id
    }, {
      $set: { "registros.$[registro].confirmacion": estado },
      $inc: { __v: 1 }
    }, {
      new: false,
      runValidators: true,
      arrayFilters: [{ "registro.jugador": jugador._id }]
    }).select("_id");
    if (!resultado) {
      return res.status(404).json({
        error: "Actividad no disponible para confirmar"
      });
    }
    return res.json({ mensaje: "Confirmación registrada", estado });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
}
module.exports = { confirmar };
