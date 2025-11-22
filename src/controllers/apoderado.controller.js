const Apoderado = require("../models/apoderado.model");
const Jugador = require("../models/jugador.model");

// Consultar apoderado y sus jugadores
exports.obtenerApoderadoConJugadores = async (req, res) => {
  try {
    const { rutApoderado } = req.params;

    const apoderado = await Apoderado.findOne({ rut: rutApoderado });
    if (!apoderado)
      return res.status(404).json({ error: "Apoderado no encontrado" });

    const jugadores = await Jugador.find({ apoderado: apoderado._id })
      .populate("categoria", "nombre");

    res.json({
      apoderado,
      jugadores,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los datos", detalle: error.message });
  }
};
