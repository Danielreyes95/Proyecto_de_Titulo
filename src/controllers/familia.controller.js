const Vinculo = require("../models/vinculo-jugador-apoderado.model");
const EscuelaJugador = require("../models/escuela-jugador.model");
const EscuelaEvento = require("../models/escuela-evento.model");

async function misJugadores(req, res, next) {
  try {
    const escuelaId = req.familia.escuela._id;
    const vinculados = await Vinculo.find({
      escuela: escuelaId, apoderado: req.familia.apoderado._id,
      estado: "activo"
    }).select("jugador").limit(30).lean();
    const ids = vinculados.map(v => v.jugador);
    // Solo jugadores ACTIVOS vinculados a esta familia dentro de la escuela.
    const players = await EscuelaJugador.find({
      _id: { $in: ids }, escuela: escuelaId, estado: "activo"
    }).select("nombre categoria").populate({
      path: "categoria", select: "nombre modalidad",
      match: { escuela: escuelaId }
    }).lean();
    const playerIds = players.map(p => p._id);
    const eventos = playerIds.length ? await EscuelaEvento.find({
      escuela: escuelaId, cerrado: true,
      "registros.jugador": { $in: playerIds }
    }).select("fechaEvento tipoEvento categoria registros.jugador registros.asistencia registros.estadisticas")
      .sort({ fechaEvento: -1 }).limit(120).lean() : [];
    const byPlayer = new Map(players.map(p => [String(p._id), []]));
    for (const event of eventos) {
      for (const registro of event.registros) {
        const history = byPlayer.get(String(registro.jugador));
        if (!history || history.length >= 8) continue;
        history.push({
          fechaEvento: event.fechaEvento,
          tipoEvento: event.tipoEvento,
          asistencia: registro.asistencia,
          // No publicar notas privadas, RUT, datos de otros jugadores ni
          // estadísticas de una persona marcada ausente/pendiente.
          goles: registro.asistencia === "presente" ?
            registro.estadisticas?.goles || 0 : null,
          asistenciasGol: registro.asistencia === "presente" ?
            registro.estadisticas?.asistenciasGol || 0 : null
        });
      }
    }
    const resumen = players.map(p => {
      const historia = byPlayer.get(String(p._id)) || [];
      const presentes = historia.filter(h => h.asistencia === "presente").length;
      const ausentes = historia.filter(h => h.asistencia === "ausente").length;
      return {
        id: String(p._id), nombre: p.nombre,
        categoria: p.categoria ? {
          nombre: p.categoria.nombre, modalidad: p.categoria.modalidad
        } : null,
        ultimasActividades: historia,
        asistenciaReciente: { presentes, ausentes,
          porcentaje: presentes + ausentes ?
            Math.round(1000 * presentes / (presentes + ausentes)) / 10 : null }
      };
    });
    res.set("Cache-Control", "no-store");
    return res.json({
      escuela: { id: String(escuelaId), nombre: req.familia.escuela.nombre,
        branding: req.familia.escuela.branding },
      jugadores: resumen
    });
  } catch (error) { return next(error); }
}
module.exports = { misJugadores };
