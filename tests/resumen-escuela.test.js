const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  pipelineResumenEscuela, resumenEscuela, periodoAnual
} = require("../src/utils/resumen-escuela");

const escuela = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const a = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
const b = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

test("resumen inicia agrupación después de filtrar institución y eventos cerrados", () => {
  const period = periodoAnual("2026", new Date("2026-09-23T12:00:00Z"));
  const steps = pipelineResumenEscuela(escuela, period);
  assert.equal(String(steps[0].$match.escuela), String(escuela));
  assert.equal(steps[0].$match.cerrado, true);
  assert.equal(steps[0].$match.fechaEvento.$gte.toISOString(),
    "2026-01-01T00:00:00.000Z");
  assert.equal(steps[1].$unwind, "$registros");
  assert.deepEqual(steps[2].$group.eventosUnicos.$addToSet, "$_id");
  assert.deepEqual(steps[2].$group.goles.$sum.$cond[0],
    { $eq: ["$registros.asistencia", "presente"] });
});

test("dos categorías agregan sin ordenar o etiquetar a jugadores", () => {
  const result = resumenEscuela([
    { _id: b, nombre: "Sub 10", modalidad: "competitivo", estado: "activa" },
    { _id: a, nombre: "Sub 8", modalidad: "formativo", estado: "inactiva" }
  ], [
    { _id: a, actividades: 2, presentes: 4, ausentes: 1, goles: 3 },
    { _id: b, actividades: 1, presentes: 2, ausentes: 0, goles: 1 }
  ], 2026);
  assert.equal(result.totales.actividades, 3);
  assert.equal(result.totales.presentes, 6);
  assert.equal(result.totales.ausentes, 1);
  assert.equal(result.totales.porcentajeAsistencia, 85.7);
  assert.equal(result.totales.goles, 4);
  assert.equal(result.categorias[0].nombre, "Sub 10");
  assert.equal(result.categorias[1].estado, "inactiva");
  assert.ok(!("jugadores" in result));
});

test("categorías sin actividades no muestran falsa tasa de asistencia", () => {
  const result = resumenEscuela([
    { _id: a, nombre: "Sub 6", modalidad: "formativo", estado: "activa" }
  ], [], 2026);
  assert.equal(result.categorias[0].actividades, 0);
  assert.equal(result.categorias[0].porcentajeAsistencia, null);
  assert.equal(result.totales.porcentajeAsistencia, null);
});
