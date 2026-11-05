const { METRICAS, BOOLEANAS } = require("./registro-rapido-validation");

function error400(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}
function periodoAnual(raw, now = new Date()) {
  const year = raw === undefined ? now.getUTCFullYear() : Number(raw);
  if (typeof raw === "string" && !/^\d{4}$/.test(raw)) {
    error400("Año inválido");
  }
  if (!Number.isInteger(year) || year < 2020 || year > now.getUTCFullYear() + 1) {
    error400("Año inválido");
  }
  return {
    anio: year,
    desde: new Date(Date.UTC(year, 0, 1)),
    hasta: new Date(Date.UTC(year + 1, 0, 1))
  };
}
function percentage(presentes, ausentes) {
  const total = presentes + ausentes;
  return total ? Math.round(presentes * 1000 / total) / 10 : null;
}
function average(total, count) {
  return count ? Math.round(total * 10 / count) / 10 : null;
}

function matches(escuela, categoria, { desde, hasta }) {
  return {
    escuela, categoria, cerrado: true,
    fechaEvento: { $gte: desde, $lt: hasta }
  };
}
function sumStats(field = "$registros.estadisticas") {
  const present = { $eq: ["$registros.asistencia", "presente"] };
  const sum = key => ({
    $sum: { $cond: [present, { $ifNull: [field + "." + key, 0] }, 0] }
  });
  const stats = Object.fromEntries(METRICAS.map(key => [key, sum(key)]));
  for (const key of BOOLEANAS) {
    stats[key === "amarilla" ? "amarillas" : "rojas"] = {
      $sum: { $cond: [
        { $and: [present, { $eq: [field + "." + key, true] }] }, 1, 0
      ] }
    };
  }
  stats.sumaRendimiento = {
    $sum: { $cond: [
      { $and: [present, { $gte: [field + ".rendimiento", 1] }] },
      { $ifNull: [field + ".rendimiento", 0] }, 0
    ] }
  };
  stats.evaluaciones = {
    $sum: { $cond: [
      { $and: [present, { $gte: [field + ".rendimiento", 1] }] }, 1, 0
    ] }
  };
  return stats;
}
function attendanceSums() {
  return {
    registros: { $sum: 1 },
    presentes: {
      $sum: { $cond: [{ $eq: ["$registros.asistencia", "presente"] }, 1, 0] }
    },
    ausentes: {
      $sum: { $cond: [{ $eq: ["$registros.asistencia", "ausente"] }, 1, 0] }
    }
  };
}

// $facet reúne el informe con una consulta, siempre tras restringir tenant,
// categoría, periodo y eventos cerrados. Evita transmitir fichas personales
// o registros completos de otros jugadores al navegador.
function pipeline(escuela, categoria, periodo) {
  return [
    { $match: matches(escuela, categoria, periodo) },
    { $facet: {
      porJugador: [
        { $unwind: "$registros" },
        { $group: {
          _id: "$registros.jugador",
          ...attendanceSums(),
          ...sumStats()
        } }
      ],
      porMes: [
        { $unwind: "$registros" },
        { $group: {
          _id: { $dateToString: {
            format: "%Y-%m", date: "$fechaEvento", timezone: "UTC"
          } },
          actividadesIds: { $addToSet: "$_id" },
          ...attendanceSums(),
          goles: sumStats().goles,
          asistenciasGol: sumStats().asistenciasGol
        } },
        { $project: {
          _id: 0, mes: "$_id", actividades: { $size: "$actividadesIds" },
          presentes: 1, ausentes: 1, goles: 1, asistenciasGol: 1
        } },
        { $sort: { mes: 1 } }
      ],
      porTipo: [
        { $group: { _id: "$tipoEvento", actividades: { $sum: 1 } } },
        { $project: { _id: 0, tipo: "$_id", actividades: 1 } }
      ]
    } }
  ];
}

function emptyRow(id, nombre, estado) {
  return {
    jugadorId: String(id), nombre, estado,
    registros: 0, presentes: 0, ausentes: 0,
    porcentajeAsistencia: null,
    ...Object.fromEntries(METRICAS.map(key => [key, 0])),
    amarillas: 0, rojas: 0, promedioRendimiento: null, evaluaciones: 0
  };
}
function summarize(facet, jugadores, anio) {
  const byId = new Map((facet.porJugador || []).map(row => [String(row._id), row]));
  const registros = (jugadores || []).map(player => {
    const id = String(player._id);
    const found = byId.get(id);
    const result = emptyRow(id, player.nombre, player.estado);
    if (!found) return result;
    for (const key of ["registros", "presentes", "ausentes", ...METRICAS,
      "amarillas", "rojas", "evaluaciones"]) result[key] = found[key] || 0;
    result.porcentajeAsistencia = percentage(result.presentes, result.ausentes);
    result.promedioRendimiento = average(
      found.sumaRendimiento || 0, found.evaluaciones || 0
    );
    return result;
  });
  const meses = Array.from({ length: 12 }, (_, i) => {
    const mes = anio + "-" + String(i + 1).padStart(2, "0");
    const found = (facet.porMes || []).find(m => m.mes === mes);
    return {
      mes, actividades: found?.actividades || 0,
      presentes: found?.presentes || 0, ausentes: found?.ausentes || 0,
      goles: found?.goles || 0, asistenciasGol: found?.asistenciasGol || 0,
      porcentajeAsistencia: percentage(found?.presentes || 0, found?.ausentes || 0)
    };
  });
  const total = meses.reduce((a, m) => ({
    actividades: a.actividades + m.actividades,
    presentes: a.presentes + m.presentes,
    ausentes: a.ausentes + m.ausentes,
    goles: a.goles + m.goles,
    asistenciasGol: a.asistenciasGol + m.asistenciasGol
  }), { actividades: 0, presentes: 0, ausentes: 0, goles: 0, asistenciasGol: 0 });
  total.porcentajeAsistencia = percentage(total.presentes, total.ausentes);
  return {
    anio, resumen: total, porMes: meses,
    porTipo: ["Entrenamiento", "Partido", "Torneo"].map(tipo => ({
      tipo, actividades: (facet.porTipo || [])
        .find(result => result.tipo === tipo)?.actividades || 0
    })),
    jugadores: registros
  };
}

module.exports = {
  periodoAnual, percentage, average, matches, pipeline, summarize
};
