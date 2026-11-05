"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { requireDirector } = require("../src/middleware/escuela-auth");
const { requirePersonalDeportivo, puedeVerCategoria } = require("../src/middleware/escuela-deporte-auth");
const { requireFamilia } = require("../src/middleware/familia-auth");
const Escuela = require("../src/models/escuela.model");
const Membresia = require("../src/models/membresia.model");
const Entrenador = require("../src/models/escuela-entrenador.model");
const Asignacion = require("../src/models/asignacion-entrenador.model");
const Apoderado = require("../src/models/escuela-apoderado.model");
const router = require("../src/routes/escuela-session.routes");

// Nunca se conecta a MongoDB ni crea información real.
const A = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const B = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
const user = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
const coach = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
const guardian = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");
const categoryA = new mongoose.Types.ObjectId("507f1f77bcf86cd799439015");
const categoryB = new mongoose.Types.ObjectId("507f1f77bcf86cd799439016");

function req(escuela = A) {
  return {
    params: { escuelaId: String(escuela) },
    escuelaUsuario: { id: user, email: "seguridad@ejemplo.invalid" }
  };
}
function res() {
  return { statusCode: 200, payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}
async function run(middleware, request) {
  const response = res();
  let nextCount = 0;
  await middleware(request, response, error => {
    if (error) throw error;
    nextCount++;
  });
  return { response, nextCount };
}
function assertScope(filter, escuela) {
  assert.equal(String(filter.escuela ?? filter._id), String(escuela));
}

test("Todas las rutas privadas por escuela validan identidad y un rol de servidor", () => {
  const routes = router.stack.filter(layer => layer.route &&
    layer.route.path.startsWith("/:escuelaId"));
  assert.ok(routes.length > 15, "Deben existir rutas privadas protegidas");
  for (const layer of routes) {
    const names = layer.route.stack.map(handler => handler.handle.name);
    assert.ok(names.includes("requireSchoolUser"),
      "Falta autenticación en " + layer.route.path);
    assert.ok(names.some(name => ["requireDirector", "requirePersonalDeportivo",
      "requireFamilia"].includes(name)),
      "Falta autorización de rol en " + layer.route.path);
  }
});

test("Un Director autorizado en Escuela A accede solo a A", async t => {
  t.mock.method(Membresia, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(String(filter.usuario), String(user));
    assert.equal(filter.rol, "director");
    assert.equal(filter.estado, "activa");
    return Promise.resolve({ _id: new mongoose.Types.ObjectId() });
  });
  t.mock.method(Escuela, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(filter.estado, "activa");
    return Promise.resolve({ _id: A, estado: "activa" });
  });
  const request = req(A);
  const result = await run(requireDirector, request);
  assert.equal(result.nextCount, 1);
  assert.equal(String(request.contextoEscuela.escuela._id), String(A));
});

test("Una cuenta de Escuela A no obtiene acceso de Director a Escuela B", async t => {
  t.mock.method(Membresia, "findOne", filter => {
    assertScope(filter, B);
    return Promise.resolve(null);
  });
  t.mock.method(Escuela, "findOne", () =>
    assert.fail("Sin membresía no se debe consultar la escuela como Director"));
  const result = await run(requireDirector, req(B));
  assert.equal(result.nextCount, 0);
  assert.equal(result.response.statusCode, 404);
  assert.equal(result.response.payload.error, "Escuela no encontrada");
});

test("Una escuela suspendida no se habilita aunque la membresía de Director exista", async t => {
  t.mock.method(Membresia, "findOne", () =>
    Promise.resolve({ _id: new mongoose.Types.ObjectId() }));
  t.mock.method(Escuela, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(filter.estado, "activa");
    return Promise.resolve(null);
  });
  const result = await run(requireDirector, req(A));
  assert.equal(result.nextCount, 0);
  assert.equal(result.response.statusCode, 404);
});

test("Entrenador de A solo obtiene categorías activas asignadas en A", async t => {
  t.mock.method(Escuela, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(filter.estado, "activa");
    return { select: async () => ({ _id: A }) };
  });
  t.mock.method(Membresia, "find", filter => {
    assertScope(filter, A);
    assert.equal(String(filter.usuario), String(user));
    assert.deepEqual(filter.rol.$in, ["director", "entrenador"]);
    return { select: async () => [{ rol: "entrenador" }] };
  });
  t.mock.method(Entrenador, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(filter.email, "seguridad@ejemplo.invalid");
    assert.equal(filter.estado, "activo");
    return { select: async () => ({ _id: coach }) };
  });
  t.mock.method(Asignacion, "find", filter => {
    assertScope(filter, A);
    assert.equal(String(filter.entrenador), String(coach));
    assert.equal(filter.estado, "activa");
    return { select() { return this; }, async lean() {
      return [{ categoria: categoryA }];
    } };
  });
  const request = req(A);
  const result = await run(requirePersonalDeportivo, request);
  assert.equal(result.nextCount, 1);
  assert.equal(request.deporteScope.rol, "entrenador");
  assert.equal(puedeVerCategoria(request, categoryA), true);
  assert.equal(puedeVerCategoria(request, categoryB), false);
});

test("Un Entrenador no adquiere derechos deportivos en otra escuela", async t => {
  t.mock.method(Escuela, "findOne", filter => {
    assertScope(filter, B);
    return { select: async () => ({ _id: B }) };
  });
  t.mock.method(Membresia, "find", filter => {
    assertScope(filter, B);
    return { select: async () => [] };
  });
  t.mock.method(Entrenador, "findOne", () =>
    assert.fail("No buscar entrenador sin membresía de B"));
  const result = await run(requirePersonalDeportivo, req(B));
  assert.equal(result.nextCount, 0);
  assert.equal(result.response.statusCode, 404);
});

test("Entrenador sin asignaciones activas no accede a registro deportivo", async t => {
  t.mock.method(Escuela, "findOne", () =>
    ({ select: async () => ({ _id: A }) }));
  t.mock.method(Membresia, "find", () =>
    ({ select: async () => [{ rol: "entrenador" }] }));
  t.mock.method(Entrenador, "findOne", () =>
    ({ select: async () => ({ _id: coach }) }));
  t.mock.method(Asignacion, "find", filter => {
    assertScope(filter, A);
    assert.equal(filter.estado, "activa");
    return { select() { return this; }, async lean() { return []; } };
  });
  const result = await run(requirePersonalDeportivo, req(A));
  assert.equal(result.nextCount, 0);
  assert.equal(result.response.statusCode, 403);
  assert.match(result.response.payload.error, /asignación activa/i);
});

test("Familia de A no puede consultar jugadores en B sin vínculo y membresía", async t => {
  t.mock.method(Escuela, "findOne", filter => {
    assertScope(filter, B);
    return { select: async () => ({ _id: B }) };
  });
  t.mock.method(Membresia, "findOne", filter => {
    assertScope(filter, B);
    assert.equal(filter.rol, "apoderado");
    return { select: async () => null };
  });
  t.mock.method(Apoderado, "findOne", filter => {
    assertScope(filter, B);
    assert.equal(filter.email, "seguridad@ejemplo.invalid");
    return { select: async () => null };
  });
  const result = await run(requireFamilia, req(B));
  assert.equal(result.nextCount, 0);
  assert.equal(result.response.statusCode, 404);
});

test("Familia autorizada requiere apoderado y membresía de la misma escuela", async t => {
  t.mock.method(Escuela, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(filter.estado, "activa");
    return { select: async () => ({ _id: A }) };
  });
  t.mock.method(Membresia, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(String(filter.usuario), String(user));
    assert.equal(filter.rol, "apoderado");
    return { select: async () => ({ _id: new mongoose.Types.ObjectId() }) };
  });
  t.mock.method(Apoderado, "findOne", filter => {
    assertScope(filter, A);
    assert.equal(String(filter.usuario), String(user));
    assert.equal(filter.email, "seguridad@ejemplo.invalid");
    return { select: async () => ({ _id: guardian }) };
  });
  const request = req(A);
  const result = await run(requireFamilia, request);
  assert.equal(result.nextCount, 1);
  assert.equal(String(request.familia.escuela._id), String(A));
  assert.equal(String(request.familia.apoderado._id), String(guardian));
});
