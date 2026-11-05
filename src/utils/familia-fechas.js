// Fechas de actividad almacenadas como YYYY-MM-DD a las 12:00 UTC.
// Evitar usar la medianoche UTC: cerca de las 21:00 en Chile ya es mañana UTC.
// Migrar a escuela.zonaHoraria cuando se habiliten escuelas de otros países.
function fechaHoyEscuela(ahora = new Date(), zonaHoraria = "America/Santiago") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zonaHoraria, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(ahora);
  const get = type => parts.find(part => part.type === type).value;
  return new Date(get("year") + "-" + get("month") + "-" +
    get("day") + "T12:00:00.000Z");
}

module.exports = { fechaHoyEscuela };
