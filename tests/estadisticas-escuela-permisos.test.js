const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const categoriaModel = require("../src/models/escuela-categoria.model");
const jugadorModel = require("../src/models/escuela-jugador.model");
const eventoModel = require("../src/models/escuela-evento.model");
const controller = require("../src/controllers/estadisticas-escuela.controller");

const escuela = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const propia = "507f1f77bcf86cd799439011";
const ajena = "507f1f77bcf86cd799439012";
const jugador = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");

function response() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}
function request(categoriaId) {
  return {
    params: { categoriaId },
    query: { anio: "2026" },
    deporteScope: { escuela: { _id: escuela },
      rol: "entrenador", categorias: [propia] }
  };
}

test("informe de categoría ajena se deniega antes de consultar datos", async t => {
  t.mock.method(categoriaModel, "findOne", () => {
    assert.fail("No debe buscar categoría ajena");
  });
  t.mock.method(eventoModel, "aggregate", () => {
    assert.fail("No debe leer eventos de categoría ajena");
  });
  const res = response();
  await controller.resumenCategoria(request(ajena), res, err => { throw err; });
  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /Categoría no encontrada/);
});

test("informe de categoría propia filtra tenant, año y actividades cerradas", async t => {
  t.mock.method(categoriaModel, "findOne", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(filter._id, propia);
    return { select() { return this; },
      async lean() {
        return { _id: new mongoose.Types.ObjectId(propia),
          nombre: "Sub 8", modalidad: "formativo", estado: "activa" };
      }
    };
  });
  t.mock.method(eventoModel, "aggregate", steps => {
    const filter = steps[0].$match;
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(String(filter.categoria), propia);
    assert.equal(filter.cerrado, true);
    assert.equal(filter.fechaEvento.$gte.toISOString(), "2026-01-01T00:00:00.000Z");
    assert.equal(filter.fechaEvento.$lt.toISOString(), "2027-01-01T00:00:00.000Z");
    return Promise.resolve([{ porJugador: [], porMes: [], porTipo: [] }]);
  });
  t.mock.method(jugadorModel, "find", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(String(filter.categoria), propia);
    return { select() { return this; },
      async lean() {
        return [{ _id: jugador, nombre: "Jugador Ejemplo", estado: "activo" }];
      }
    };
  });
  const res = response();
  await controller.resumenCategoria(request(propia), res, err => { throw err; });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.resumen.actividades, 0);
  assert.equal(res.body.resumen.porcentajeAsistencia, null);
  assert.equal(res.body.jugadores[0].nombre, "Jugador Ejemplo");
  assert.equal(res.body.jugadores[0].registros, 0);
  assert.equal(Object.hasOwn(res.body.jugadores[0], "rut"), false);
  assert.equal(Object.hasOwn(res.body.jugadores[0], "email"), false);
});
