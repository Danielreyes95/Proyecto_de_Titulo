const test = require("node:test");
const assert = require("node:assert/strict");
const { nuevoEvento, validarLote } = require("../src/utils/registro-rapido-validation");

const a = "507f1f77bcf86cd799439011";
const b = "507f1f77bcf86cd799439012";

test("programa una actividad con categoría y fecha, sin aceptar escuela externa", () => {
  const result = nuevoEvento({
    categoriaId: a, fechaEvento: "2026-09-23", tipoEvento: "Entrenamiento"
  });
  assert.equal(result.categoriaId, a);
  assert.equal(result.fechaEvento.toISOString().slice(0, 10), "2026-09-23");
  assert.throws(() => nuevoEvento({
    categoriaId: a, fechaEvento: "2026-09-23", tipoEvento: "Partido", escuelaId: b
  }), /no permitidos/);
});

test("validación por lote requiere revisión y limita campos editables", () => {
  const result = validarLote({
    revision: 0,
    cambios: [
      { jugadorId: a, asistencia: "presente",
        estadisticas: { goles: 2, asistenciasGol: 1, amarilla: false } },
      { jugadorId: b, observacion: "Buen esfuerzo" }
    ]
  });
  assert.equal(result.cambios.length, 2);
  assert.equal(result.cambios[0].estadisticas.goles, 2);
  assert.throws(() => validarLote({
    revision: 0, cambios: [{ jugadorId: a, escuela: b }]
  }), /no permitidos/);
});

test("rechaza falsos ceros, resultados negativos y alteración de versión", () => {
  for (const value of [-1, 100, 1.5, "5"]) {
    assert.throws(() => validarLote({
      revision: 0,
      cambios: [{ jugadorId: a, estadisticas: { goles: value } }]
    }), /fuera de rango/);
  }
  assert.throws(() => validarLote({
    revision: "0", cambios: [{ jugadorId: a, asistencia: "ausente" }]
  }), /Lote o revisión/);
});

test("no duplica jugadores y no acepta cargas masivas", () => {
  assert.throws(() => validarLote({
    revision: 0,
    cambios: [{ jugadorId: a, asistencia: "presente" },
      { jugadorId: a, asistencia: "ausente" }]
  }), /duplicado/);
  assert.throws(() => validarLote({
    revision: 0,
    cambios: Array.from({ length: 101 }, (_, i) => ({
      jugadorId: i.toString(16).padStart(24, "0"), asistencia: "presente"
    }))
  }), /Lote o revisión/);
});

test("asistencia pendiente explícita y nota con longitud acotada", () => {
  assert.equal(validarLote({
    revision: 5, cambios: [{
      jugadorId: a, asistencia: "pendiente", observacion: ""
    }]
  }).cambios[0].asistencia, "pendiente");
  assert.throws(() => validarLote({
    revision: 5, cambios: [{ jugadorId: a, observacion: "x".repeat(501) }]
  }), /Observación inválida/);
});
