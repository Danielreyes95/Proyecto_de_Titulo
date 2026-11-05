const EscuelaCategoria = require("../models/escuela-categoria.model");
const EscuelaJugador = require("../models/escuela-jugador.model");
const EscuelaEvento = require("../models/escuela-evento.model");
const { puedeVerCategoria } = require("../middleware/escuela-deporte-auth");
const { periodoAnual, matches, pipeline, summarize } =
  require("../utils/estadisticas-escuela");

function respond(error, res, next) {
  if (error.status === 400) {
    return res.status(400).json({ error: error.message });
  }
  return next(error);
}
function isId(value) {
  return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
}
async function categoriaAutorizada(req, res) {
  const id = req.params.categoriaId;
  if (!isId(id)) {
    res.status(400).json({ error: "Categoría inválida" });
    return null;
  }
  if (!puedeVerCategoria(req, id)) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return null;
  }
  const categoria = await EscuelaCategoria.findOne({
    _id: id, escuela: req.deporteScope.escuela._id
  }).select("nombre modalidad estado").lean();
  if (!categoria) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return null;
  }
  return categoria;
}

async function resumenCategoria(req, res, next) {
  try {
    const categoria = await categoriaAutorizada(req, res);
    if (!categoria) return;
    const periodo = periodoAnual(req.query.anio);
    const escuela = req.deporteScope.escuela._id;
    const [rows, players] = await Promise.all([
      EscuelaEvento.aggregate(pipeline(escuela, categoria._id, periodo)),
      EscuelaJugador.find({
        escuela, categoria: categoria._id
      }).select("nombre estado categoria").lean()
    ]);
    const facet = rows[0] || { porJugador: [], porMes: [], porTipo: [] };
    const found = new Set(players.map(p => String(p._id)));
    const historicalIds = facet.porJugador.map(p => p._id)
      .filter(id => !found.has(String(id)));
    if (historicalIds.length) {
      const historical = await EscuelaJugador.find({
        escuela, _id: { $in: historicalIds }
      }).select("nombre estado").lean();
      players.push(...historical);
    }
    const result = summarize(facet, players, periodo.anio);
    return res.json({
      categoria: { id: categoria._id, nombre: categoria.nombre,
        modalidad: categoria.modalidad, estado: categoria.estado },
      ...result
    });
  } catch (error) { return respond(error, res, next); }
}

async function detalleJugador(req, res, next) {
  try {
    const categoria = await categoriaAutorizada(req, res);
    if (!categoria) return;
    if (!isId(req.params.jugadorId)) {
      return res.status(400).json({ error: "Jugador inválido" });
    }
    const periodo = periodoAnual(req.query.anio);
    const escuela = req.deporteScope.escuela._id;
    const jugador = await EscuelaJugador.findOne({
      _id: req.params.jugadorId, escuela
    }).select("nombre categoria").lean();
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado" });

    const filtro = {
      ...matches(escuela, categoria._id, periodo),
      "registros.jugador": jugador._id
    };
    // Se muestra una ventana explícita de hasta 20 actividades recientes.
    // El resumen anual del jugador sigue calculándose con TODAS.
    const eventos = await EscuelaEvento.find(filtro)
      .select("fechaEvento tipoEvento registros.jugador registros.asistencia registros.estadisticas")
      .sort({ fechaEvento: -1 }).limit(21).lean();
    if (!eventos.length && String(jugador.categoria) !== String(categoria._id)) {
      // Evita utilizar este endpoint para enumerar jugadores de otras
      // categorías cuando no tienen historial en la categoría autorizada.
      return res.status(404).json({ error: "Jugador no encontrado" });
    }
    const registros = eventos.slice(0, 20).map(evento => {
      const registro = evento.registros.find(r =>
        String(r.jugador) === String(jugador._id));
      return {
        eventoId: evento._id,
        fechaEvento: evento.fechaEvento,
        tipoEvento: evento.tipoEvento,
        asistencia: registro?.asistencia || "pendiente",
        estadisticas: registro?.asistencia === "presente" ?
          registro.estadisticas : null
      };
    });
    return res.json({
      jugador: { id: jugador._id, nombre: jugador.nombre },
      categoria: { id: categoria._id, nombre: categoria.nombre,
        modalidad: categoria.modalidad },
      anio: periodo.anio, ultimasActividades: registros,
      hayMas: eventos.length > 20
    });
  } catch (error) { return respond(error, res, next); }
}

module.exports = { resumenCategoria, detalleJugador };
