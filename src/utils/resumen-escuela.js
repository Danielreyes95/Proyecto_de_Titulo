const { periodoAnual, percentage } = require("./estadisticas-escuela");

// Solo totales institucionales. No incluir identificadores, nombres ni notas
// de jugadores en el resumen de dirección.
function pipelineResumenEscuela(escuela, periodo) {
  return [
    { $match: {
      escuela, cerrado: true,
      fechaEvento: { $gte: periodo.desde, $lt: periodo.hasta }
    } },
    { $unwind: "$registros" },
    { $group: {
      _id: "$categoria",
      eventosUnicos: { $addToSet: "$_id" },
      presentes: { $sum: { $cond: [
        { $eq: ["$registros.asistencia", "presente"] }, 1, 0
      ] } },
      ausentes: { $sum: { $cond: [
        { $eq: ["$registros.asistencia", "ausente"] }, 1, 0
      ] } },
      goles: { $sum: { $cond: [
        { $eq: ["$registros.asistencia", "presente"] },
        { $ifNull: ["$registros.estadisticas.goles", 0] }, 0
      ] } }
    } },
    { $project: {
      _id: 1,
      actividades: { $size: "$eventosUnicos" },
      presentes: 1, ausentes: 1, goles: 1
    } }
  ];
}

function resumenEscuela(categorias, aggregates, anio) {
  const byId = new Map(aggregates.map(row => [String(row._id), row]));
  const filas = categorias.map(cat => {
    const result = byId.get(String(cat._id)) || {};
    const presentes = result.presentes || 0;
    const ausentes = result.ausentes || 0;
    return {
      categoriaId: String(cat._id),
      nombre: cat.nombre,
      modalidad: cat.modalidad,
      estado: cat.estado,
      actividades: result.actividades || 0,
      presentes, ausentes,
      porcentajeAsistencia: percentage(presentes, ausentes),
      goles: result.goles || 0
    };
  }).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es-CL") ||
    a.modalidad.localeCompare(b.modalidad, "es-CL")
  );
  const totales = filas.reduce((acc, row) => {
    for (const key of ["actividades", "presentes", "ausentes", "goles"]) {
      acc[key] += row[key];
    }
    return acc;
  }, { actividades: 0, presentes: 0, ausentes: 0, goles: 0 });
  totales.porcentajeAsistencia =
    percentage(totales.presentes, totales.ausentes);
  return { anio, totales, categorias: filas };
}

module.exports = { pipelineResumenEscuela, resumenEscuela, periodoAnual };
