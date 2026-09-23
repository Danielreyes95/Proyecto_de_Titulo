const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const controller = require("../src/controllers/registro-rapido.controller");
const EscuelaCategoria = require("../src/models/escuela-categoria.model");
const EscuelaJugador = require("../src/models/escuela-jugador.model");
const EscuelaEvento = require("../src/models/escuela-evento.model");

const escuelaId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const propia = "507f1f77bcf86cd799439011";
const ajena = "507f1f77bcf86cd799439012";

function response() {
  return {
    statusCode: 200, body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
}
function request(categoriaId) {
  return {
    deporteScope: {
      escuela: { _id: escuelaId },
      rol: "entrenador",
      categorias: [propia]
    },
    body: { categoriaId, fechaEvento: "2026-09-23", tipoEvento: "Entrenamiento" }
  };
}

test("entrenador no puede crear evento en categoría no asignada", async t => {
  t.mock.method(EscuelaCategoria, "findOne", () => {
    assert.fail("No debe consultarse otra categoría");
  });
  const res = response();
  await controller.crear(request(ajena), res, error => { throw error; });
  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /Categoría no encontrada/);
});

test("entrenador autorizado solo consulta categoría y jugadores de su escuela", async t => {
  t.mock.method(EscuelaCategoria, "findOne", filter => {
    assert.equal(String(filter.escuela), String(escuelaId));
    assert.equal(filter._id, propia);
    assert.equal(filter.estado, "activa");
    return { select: async () => ({ _id: new mongoose.Types.ObjectId(propia) }) };
  });
  t.mock.method(EscuelaJugador, "find", filter => {
    assert.equal(String(filter.escuela), String(escuelaId));
    assert.equal(String(filter.categoria), propia);
    assert.equal(filter.estado, "activo");
    return { select() { return this; }, limit() { return this; },
      async lean() { return [{ _id: new mongoose.Types.ObjectId(ajena) }]; } };
  });
  t.mock.method(EscuelaEvento, "create", async payload => {
    assert.equal(String(payload.escuela), String(escuelaId));
    assert.equal(String(payload.categoria), propia);
    assert.equal(payload.registros.length, 1);
    assert.equal(payload.registros[0].asistencia, "pendiente");
    return { ...payload, _id: new mongoose.Types.ObjectId(), __v: 0 };
  });
  const res = response();
  await controller.crear(request(propia), res, error => { throw error; });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.evento.pendientes, 1);
});
