const mongoose = require("mongoose");
const EscuelaEvento = require("../models/escuela-evento.model");
const EscuelaCategoria = require("../models/escuela-categoria.model");
const EscuelaJugador = require("../models/escuela-jugador.model");
const { puedeVerCategoria } = require("../middleware/escuela-deporte-auth");
const { nuevoEvento, validarLote, METRICAS, BOOLEANAS } =
  require("../utils/registro-rapido-validation");

function errorResponse(error, res, next) {
  if (error.status === 400 || error.name === "ValidationError") {
    return res.status(400).json({
      error: error.status === 400 ? error.message : "Datos deportivos inválidos"
    });
  }
  if (error.name === "VersionError") {
    return res.status(409).json({
      error: "El evento cambió en otro dispositivo. Conserva tus cambios y sincroniza antes de volver a guardar.",
      codigo: "VERSION_CONFLICT"
    });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "Ya existe este evento de categoría, fecha y tipo" });
  }
  return next(error);
}
function escuela(req) { return req.deporteScope.escuela._id; }
function error400(message) {
  const e = new Error(message); e.status = 400; throw e;
}
function validId(value) {
  return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);
}
function scopedEvent(req, id) {
  return EscuelaEvento.findOne({ _id: id, escuela: escuela(req) });
}
function canAccess(req, event) {
  return puedeVerCategoria(req, event.categoria);
}
function eventSummary(event) {
  return {
    _id: event._id,
    categoria: event.categoria,
    fechaEvento: event.fechaEvento,
    horaInicio: event.horaInicio || null,
    tipoEvento: event.tipoEvento,
    descripcion: event.descripcion,
    cerrado: event.cerrado,
    revision: event.__v,
    cantidadJugadores: event.registros.length,
    pendientes: event.registros.filter(r => r.asistencia === "pendiente").length
  };
}
async function listar(req, res, next) {
  try {
    const filter = { escuela: escuela(req) };
    if (req.query.categoriaId !== undefined) {
      if (!validId(req.query.categoriaId)) error400("Categoría inválida");
      if (!puedeVerCategoria(req, req.query.categoriaId)) {
        return res.status(404).json({ error: "Categoría no encontrada" });
      }
      filter.categoria = req.query.categoriaId;
    } else if (req.deporteScope.rol !== "director") {
      filter.categoria = { $in: req.deporteScope.categorias };
    }
    const eventos = await EscuelaEvento.find(filter)
      .sort({ fechaEvento: -1, createdAt: -1 })
      .limit(100)
      .select("categoria fechaEvento horaInicio tipoEvento descripcion cerrado registros.asistencia")
      .lean();
    return res.json({ eventos: eventos.map(eventSummary) });
  } catch (error) { return errorResponse(error, res, next); }
}
// Opciones para iniciar la actividad desde el propio teléfono. El entrenador
// recibe SOLO sus categorías asignadas, no las categorías de otras escuelas.
async function misCategorias(req, res, next) {
  try {
    const filter = { escuela: escuela(req) };
    // Solo los informes solicitan ver categorías históricas inactivas.
    // La creación de eventos vuelve a validar categoría activa en servidor.
    if (req.query.incluirInactivas !== "true") filter.estado = "activa";
    if (req.deporteScope.rol !== "director") {
      filter._id = { $in: req.deporteScope.categorias };
    }
    const categorias = await EscuelaCategoria.find(filter)
      .select("nombre modalidad edadMin edadMax")
      .sort({ edadMin: 1, nombre: 1, modalidad: 1 })
      .limit(100).lean();
    return res.json({ categorias });
  } catch (error) { return errorResponse(error, res, next); }
}

async function crear(req, res, next) {
  try {
    const fields = nuevoEvento(req.body);
    if (!puedeVerCategoria(req, fields.categoriaId)) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    const categoria = await EscuelaCategoria.findOne({
      _id: fields.categoriaId, escuela: escuela(req), estado: "activa"
    }).select("_id nombre modalidad");
    if (!categoria) return res.status(404).json({ error: "Categoría no encontrada" });
    const jugadores = await EscuelaJugador.find({
      escuela: escuela(req), categoria: categoria._id, estado: "activo"
    }).select("_id").limit(201).lean();
    if (!jugadores.length) return res.status(400).json({
      error: "La categoría aún no tiene jugadores activos"
    });
    if (jugadores.length > 200) return res.status(400).json({
      error: "Revisar el tamaño de categoría antes de registrar"
    });
    const evento = await EscuelaEvento.create({
      escuela: escuela(req), categoria: categoria._id,
      fechaEvento: fields.fechaEvento, horaInicio: fields.horaInicio,
      tipoEvento: fields.tipoEvento,
      descripcion: fields.descripcion,
      registros: jugadores.map(j => ({
        jugador: j._id, asistencia: "pendiente", estadisticas: {}
      }))
    });
    return res.status(201).json({ evento: eventSummary(evento) });
  } catch (error) { return errorResponse(error, res, next); }
}
async function detalle(req, res, next) {
  try {
    if (!validId(req.params.eventoId)) error400("Evento inválido");
    const event = await scopedEvent(req, req.params.eventoId);
    if (!event || !canAccess(req, event)) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    const categoria = await EscuelaCategoria.findOne({
      _id: event.categoria, escuela: escuela(req)
    }).select("nombre modalidad").lean();
    // Nunca devolvemos RUT, fecha de nacimiento ni datos del apoderado
    // a la pantalla de registro en cancha.
    const ids = event.registros.map(r => r.jugador);
    const players = await EscuelaJugador.find({
      _id: { $in: ids }, escuela: escuela(req)
    }).select("nombre").lean();
    const nombres = new Map(players.map(p => [String(p._id), p.nombre]));
    return res.json({
      evento: { ...eventSummary(event), categoriaNombre:
        categoria ? categoria.nombre + " · " + categoria.modalidad : "Categoría" },
      jugadores: event.registros.map(r => ({
        jugadorId: String(r.jugador), nombre: nombres.get(String(r.jugador)) || "Jugador sin ficha",
        asistencia: r.asistencia, estadisticas: r.estadisticas,
        observacion: r.observacion
      }))
    });
  } catch (error) { return errorResponse(error, res, next); }
}
function resetStats(record) {
  for (const key of METRICAS) record.estadisticas[key] = 0;
  for (const key of BOOLEANAS) record.estadisticas[key] = false;
  record.estadisticas.rendimiento = null;
}
async function guardarLote(req, res, next) {
  try {
    if (!validId(req.params.eventoId)) error400("Evento inválido");
    const { revision, cambios } = validarLote(req.body);
    const event = await scopedEvent(req, req.params.eventoId);
    if (!event || !canAccess(req, event)) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    if (event.cerrado) return res.status(409).json({ error: "Actividad cerrada" });
    if (event.__v !== revision) {
      return res.status(409).json({
        codigo: "VERSION_CONFLICT",
        error: "El evento cambió en otro dispositivo. Conserva los cambios y sincroniza."
      });
    }
    const records = new Map(event.registros.map(r => [String(r.jugador), r]));
    for (const change of cambios) {
      const record = records.get(change.jugadorId.toLowerCase());
      if (!record) error400("Jugador no pertenece al listado de esta actividad");
      if (change.asistencia !== undefined) record.asistencia = change.asistencia;
      if (record.asistencia !== "presente") {
        if (change.estadisticas && Object.entries(change.estadisticas).some(
          ([key, value]) => value !== null && value !== 0 && value !== false
        )) error400("Marca presente antes de registrar estadísticas");
        resetStats(record);
      } else if (change.estadisticas) {
        for (const [key, value] of Object.entries(change.estadisticas)) {
          record.estadisticas[key] = value;
        }
      }
      if (change.observacion !== undefined) record.observacion = change.observacion;
    }
    await event.save(); // optimisticConcurrency evita pisar otra edición concurrente.
    return res.json({
      mensaje: "Cambios guardados",
      revision: event.__v,
      actualizado: event.updatedAt,
      pendientes: event.registros.filter(r => r.asistencia === "pendiente").length
    });
  } catch (error) { return errorResponse(error, res, next); }
}
async function cerrar(req, res, next) {
  try {
    if (!validId(req.params.eventoId)) error400("Evento inválido");
    const event = await scopedEvent(req, req.params.eventoId);
    if (!event || !canAccess(req, event)) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }
    if (event.cerrado) return res.json({ mensaje: "Actividad ya cerrada" });
    if (event.registros.some(r => r.asistencia === "pendiente")) {
      return res.status(409).json({ error: "Completa la asistencia pendiente antes de cerrar" });
    }
    event.cerrado = true;
    await event.save();
    return res.json({ mensaje: "Actividad cerrada", revision: event.__v });
  } catch (error) { return errorResponse(error, res, next); }
}
module.exports = { listar, misCategorias, crear, detalle, guardarLote, cerrar };
