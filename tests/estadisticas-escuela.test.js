const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  periodoAnual, percentage, average, matches, pipeline, summarize
} = require("../src/utils/estadisticas-escuela");

const escuela = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const categoria = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
const jugador1 = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
const jugador2 = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

test("año exacto en UTC y filtro obliga tenant, categoría y cerrado", () => {
  const periodo = periodoAnual("2026", new Date("2026-09-23T12:00:00Z"));
  assert.equal(periodo.desde.toISOString(), "2026-01-01T00:00:00.000Z");
  assert.equal(periodo.hasta.toISOString(), "2027-01-01T00:00:00.000Z");
  const filter = matches(escuela, categoria, periodo);
  assert.equal(String(filter.escuela), String(escuela));
  assert.equal(String(filter.categoria), String(categoria));
  assert.equal(filter.cerrado, true);
  assert.deepEqual(pipeline(escuela, categoria, periodo)[0], { $match: filter });
  assert.throws(() => periodoAnual("2026-2027"), /Año inválido/);
  assert.throws(() => periodoAnual("1900"), /Año inválido/);
  assert.throws(() => periodoAnual("9999"), /Año inválido/);
});

test("porcentajes sin datos no se representan como asistencia perfecta ni cero", () => {
  assert.equal(percentage(0, 0), null);
  assert.equal(percentage(1, 2), 33.3);
  assert.equal(average(0, 0), null);
  assert.equal(average(17, 2), 8.5);
});

test("resumen mensual y jugador se calcula solo a partir de la agregación recibida", () => {
  const result = summarize({
    porJugador: [{
      _id: jugador1, registros: 3, presentes: 2, ausentes: 1,
      goles: 2, asistenciasGol: 1, pasesClave: 3,
      recuperaciones: 5, tirosArco: 4,
      faltasCometidas: 1, faltasRecibidas: 2,
      amarillas: 1, rojas: 0, sumaRendimiento: 17, evaluaciones: 2
    }],
    porMes: [
      { mes: "2026-01", actividades: 1, presentes: 1, ausentes: 1, goles: 1, asistenciasGol: 1 },
      { mes: "2026-02", actividades: 2, presentes: 3, ausentes: 1, goles: 2, asistenciasGol: 1 }
    ],
    porTipo: [
      { tipo: "Entrenamiento", actividades: 1 },
      { tipo: "Partido", actividades: 2 }
    ]
  }, [
    { _id: jugador1, nombre: "Jugador Ejemplo A", estado: "activo" },
    { _id: jugador2, nombre: "Jugador Ejemplo B", estado: "activo" }
  ], 2026);

  assert.equal(result.resumen.actividades, 3);
  assert.equal(result.resumen.presentes, 4);
  assert.equal(result.resumen.ausentes, 2);
  assert.equal(result.resumen.porcentajeAsistencia, 66.7);
  assert.equal(result.resumen.goles, 3);
  assert.equal(result.porMes.length, 12);
  assert.equal(result.porMes[2].actividades, 0);
  assert.equal(result.porMes[2].porcentajeAsistencia, null);
  assert.equal(result.porTipo[0].actividades, 1);
  assert.equal(result.porTipo[1].actividades, 2);
  assert.equal(result.porTipo[2].actividades, 0);
  assert.equal(result.jugadores[0].porcentajeAsistencia, 66.7);
  assert.equal(result.jugadores[0].promedioRendimiento, 8.5);
  assert.equal(result.jugadores[0].goles, 2);
  assert.equal(result.jugadores[1].registros, 0);
  assert.equal(result.jugadores[1].promedioRendimiento, null);
});

test("agregación suma goles, tarjetas y nota SOLO para jugadores presentes", () => {
  const facet = pipeline(escuela, categoria,
    periodoAnual("2026", new Date("2026-09-23T12:00:00Z")))[1].$facet;
  const stats = facet.porJugador[1].$group;
  assert.deepEqual(stats.goles.$sum.$cond[0], {
    $eq: ["$registros.asistencia", "presente"]
  });
  assert.equal(stats.amarillas.$sum.$cond[0].$and[1].$eq[1], true);
  assert.equal(stats.evaluaciones.$sum.$cond[0].$and[1].$gte[1], 1);
});
