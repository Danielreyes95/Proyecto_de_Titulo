const METRICAS = Object.freeze([
  "goles", "asistenciasGol", "pasesClave", "recuperaciones",
  "tirosArco", "faltasCometidas", "faltasRecibidas"
]);
const BOOLEANAS = Object.freeze(["amarilla", "roja"]);
const ASISTENCIAS = Object.freeze(["pendiente", "presente", "ausente"]);

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
function plain(value) {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
function fechaEvento(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail("Fecha inválida");
  const d = new Date(value + "T12:00:00.000Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    fail("Fecha inválida");
  }
  return d;
}
function id(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) {
    fail("Identificador inválido");
  }
  return value;
}
function nuevoEvento(body) {
  if (!plain(body) || Object.keys(body).some(k =>
    !["categoriaId", "fechaEvento", "tipoEvento", "descripcion"].includes(k))) {
    fail("Campos no permitidos");
  }
  const categoriaId = id(body.categoriaId);
  const fecha = fechaEvento(body.fechaEvento);
  if (!["Entrenamiento", "Partido", "Torneo"].includes(body.tipoEvento)) {
    fail("Tipo de actividad inválido");
  }
  if (body.descripcion !== undefined &&
      (typeof body.descripcion !== "string" || body.descripcion.length > 300)) {
    fail("Descripción inválida");
  }
  return {
    categoriaId, fechaEvento: fecha, tipoEvento: body.tipoEvento,
    descripcion: body.descripcion?.trim() || ""
  };
}
function validarLote(body) {
  if (!plain(body) || Object.keys(body).some(k => !["revision", "cambios"].includes(k)) ||
      !Number.isInteger(body.revision) || body.revision < 0 ||
      !Array.isArray(body.cambios) || !body.cambios.length || body.cambios.length > 200) {
    fail("Lote o revisión inválidos");
  }
  const ids = new Set();
  const changes = body.cambios.map(change => {
    if (!plain(change) || Object.keys(change).some(k =>
      !["jugadorId", "asistencia", "estadisticas", "observacion"].includes(k))) {
      fail("Campos de jugador no permitidos");
    }
    const jugadorId = id(change.jugadorId);
    if (ids.has(jugadorId.toLowerCase())) fail("Jugador duplicado en lote");
    ids.add(jugadorId.toLowerCase());
    if (!["asistencia", "estadisticas", "observacion"].some(k => k in change)) {
      fail("Cambio vacío");
    }
    const result = { jugadorId };
    if ("asistencia" in change) {
      if (!ASISTENCIAS.includes(change.asistencia)) fail("Asistencia inválida");
      result.asistencia = change.asistencia;
    }
    if ("observacion" in change) {
      if (typeof change.observacion !== "string" || change.observacion.length > 500) {
        fail("Observación inválida");
      }
      result.observacion = change.observacion.trim();
    }
    if ("estadisticas" in change) {
      if (!plain(change.estadisticas) || !Object.keys(change.estadisticas).length ||
          Object.keys(change.estadisticas).some(k =>
            !METRICAS.includes(k) && !BOOLEANAS.includes(k) && k !== "rendimiento")) {
        fail("Estadísticas inválidas");
      }
      const stats = {};
      for (const [metric, value] of Object.entries(change.estadisticas)) {
        if (METRICAS.includes(metric) && (!Number.isInteger(value) || value < 0 || value > 99)) {
          fail("Valor fuera de rango: " + metric);
        }
        if (BOOLEANAS.includes(metric) && typeof value !== "boolean") {
          fail("Tarjeta inválida: " + metric);
        }
        if (metric === "rendimiento" &&
            value !== null && (!Number.isInteger(value) || value < 1 || value > 10)) {
          fail("Rendimiento inválido");
        }
        stats[metric] = value;
      }
      result.estadisticas = stats;
    }
    return result;
  });
  return { revision: body.revision, cambios: changes };
}
module.exports = { nuevoEvento, validarLote, METRICAS, BOOLEANAS, ASISTENCIAS };
