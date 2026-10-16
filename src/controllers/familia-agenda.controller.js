const Vinculo = require("../models/vinculo-jugador-apoderado.model");
const Jugador = require("../models/escuela-jugador.model");
const Evento = require("../models/escuela-evento.model");
const Aviso = require("../models/escuela-aviso.model");
const { fechaHoyEscuela } = require("../utils/familia-fechas");

// Respuesta deliberadamente reducida: no incluye nómina, RUT, estadísticas,
// identidad de otros apoderados, notas privadas ni evento completo.
async function agenda(req, res, next) {
  try {
    const escuela = req.familia.escuela._id;
    const vinculos = await Vinculo.find({
      escuela, apoderado: req.familia.apoderado._id, estado: "activo"
    }).select("jugador").limit(30).lean();
    if (!vinculos.length) {
      return res.json({ proximasActividades: [], avisos: [] });
    }
    const jugadores = await Jugador.find({
      _id: { $in: vinculos.map(v => v.jugador) },
      escuela, estado: "activo"
    }).select("nombre categoria").lean();
    if (!jugadores.length) {
      return res.json({ proximasActividades: [], avisos: [] });
    }

    const categorias = [...new Set(jugadores.map(p => String(p.categoria)))];
    const ids = jugadores.map(p => p._id);
    const [eventos, avisos] = await Promise.all([
      Evento.find({
        escuela, cerrado: false, fechaEvento: { $gte: fechaHoyEscuela() },
        categoria: { $in: categorias },
        "registros.jugador": { $in: ids }
      }).select("categoria fechaEvento horaInicio tipoEvento registros.jugador registros.confirmacion")
        .sort({ fechaEvento: 1, horaInicio: 1 }).limit(100).lean(),
      Aviso.find({
        escuela, estado: "publicado",
        categoria: { $in: [null, ...categorias] }
      }).select("titulo mensaje categoria publicadoEn")
        .sort({ publicadoEn: -1 }).limit(20).lean()
    ]);

    const porId = new Map(jugadores.map(p => [String(p._id), p]));
    const proximasActividades = [];
    for (const event of eventos) {
      const relacionados = [];
      const confirmaciones = [];
      for (const entry of event.registros) {
        const jugador = porId.get(String(entry.jugador));
        // No mostrar eventos de la antigua categoría tras un traslado.
        if (jugador && String(jugador.categoria) === String(event.categoria)) {
          relacionados.push(jugador.nombre);
          confirmaciones.push({
            jugadorId: String(jugador._id),
            nombre: jugador.nombre,
            estado: entry.confirmacion || "pendiente"
          });
        }
      }
      if (!relacionados.length) continue;
      proximasActividades.push({
        id: String(event._id),
        tipoEvento: event.tipoEvento,
        fechaEvento: event.fechaEvento,
        horaInicio: event.horaInicio || null,
        jugadores: relacionados,
        confirmaciones
      });
      if (proximasActividades.length >= 15) break;
    }
    return res.json({
      proximasActividades,
      avisos: avisos.map(a => ({
        id: String(a._id), titulo: a.titulo, mensaje: a.mensaje,
        alcance: a.categoria ? "categoria" : "escuela",
        publicadoEn: a.publicadoEn
      }))
    });
  } catch (error) { return next(error); }
}
module.exports = { agenda };
