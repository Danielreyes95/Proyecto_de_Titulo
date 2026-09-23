const test = require("node:test");
const assert = require("node:assert/strict");
const { validarAviso } = require("../src/utils/aviso-escuela-validation");
const { fechaHoyEscuela } = require("../src/utils/familia-fechas");
const { nuevoEvento } = require("../src/utils/registro-rapido-validation");

test("aviso general publicado no acepta escuela, autor o HTML de control", () => {
  const data = validarAviso({
    titulo: " Cambio de horario ", mensaje: "Se avisará por categoría.",
    categoriaId: null, publicar: true
  });
  assert.equal(data.titulo, "Cambio de horario");
  assert.equal(data.categoriaId, null);
  assert.equal(data.publicar, true);
  for(const campo of ["escuela", "creadoPor", "estado", "publicadoEn"]) {
    assert.throws(() => validarAviso({
      titulo: "Aviso", mensaje: "Mensaje", [campo]: "no permitido"
    }), /campos no permitidos/);
  }
});

test("anuncio acotado a categoría válida y texto", () => {
  assert.equal(validarAviso({
    titulo: "Partido", mensaje: "Nos vemos", categoriaId:
      "507f1f77bcf86cd799439011"
  }).publicar, false);
  assert.throws(() => validarAviso({
    titulo: "Partido", mensaje: "Nos vemos", categoriaId: "otra escuela"
  }), /Categoría inválida/);
  assert.throws(() => validarAviso({
    titulo: "x".repeat(121), mensaje: "Mensaje"
  }), /Título inválido/);
});

test("día deportivo en Chile no cambia al avanzar fecha UTC", () => {
  assert.equal(fechaHoyEscuela(new Date("2026-09-24T01:30:00.000Z"))
    .toISOString(), "2026-09-23T12:00:00.000Z");
});

test("actividad acepta hora opcional y rechaza horas imposibles", () => {
  const base = {
    categoriaId: "507f1f77bcf86cd799439011",
    fechaEvento: "2026-09-23", tipoEvento: "Entrenamiento"
  };
  assert.equal(nuevoEvento({ ...base, horaInicio: "18:30" }).horaInicio, "18:30");
  assert.equal(nuevoEvento(base).horaInicio, null);
  assert.throws(() => nuevoEvento({ ...base, horaInicio: "27:80" }),
    /Hora de actividad inválida/);
});
