const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { requireFamilia } = require("../src/middleware/familia-auth");
const { misJugadores } = require("../src/controllers/familia.controller");
const Escuela = require("../src/models/escuela.model");
const Membresia = require("../src/models/membresia.model");
const Apoderado = require("../src/models/escuela-apoderado.model");
const Vinculo = require("../src/models/vinculo-jugador-apoderado.model");
const Jugador = require("../src/models/escuela-jugador.model");
const Evento = require("../src/models/escuela-evento.model");

const escuelaId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const apoderadoId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
const usuarioId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
const jugadorId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
const otroJugadorId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");

function response() {
  return {
    code: 200, data: null,
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; },
    set() { return this; }
  };
}
function req() {
  return {
    params: { escuelaId: String(escuelaId) },
    escuelaUsuario: {
      id: usuarioId, email: "familia@ejemplo.test"
    }
  };
}
test("identidad de familia exige membresía y contacto activo de MISMA escuela", async t => {
  t.mock.method(Escuela, "findOne", filter => {
    assert.equal(String(filter._id), String(escuelaId));
    assert.equal(filter.estado, "activa");
    return { select: async () => ({ _id: escuelaId, nombre: "Prueba" }) };
  });
  t.mock.method(Membresia, "findOne", filter => {
    assert.equal(String(filter.escuela), String(escuelaId));
    assert.equal(String(filter.usuario), String(usuarioId));
    assert.equal(filter.rol, "apoderado");
    return { select: async () => ({ _id: "membresia" }) };
  });
  t.mock.method(Apoderado, "findOne", filter => {
    assert.equal(String(filter.escuela), String(escuelaId));
    assert.equal(String(filter.usuario), String(usuarioId));
    assert.equal(filter.email, "familia@ejemplo.test");
    assert.equal(filter.estado, "activo");
    return { select: async () => ({ _id: apoderadoId }) };
  });
  const request = req(), res = response();
  let called = false;
  await requireFamilia(request, res, error => {
    assert.equal(error, undefined); called = true;
  });
  assert.equal(called, true);
  assert.equal(String(request.familia.apoderado._id), String(apoderadoId));
});

test("sin ficha vinculada no entrega sesión familiar aunque exista usuario", async t => {
  t.mock.method(Escuela, "findOne", () =>
    ({ select: async () => ({ _id: escuelaId }) }));
  t.mock.method(Membresia, "findOne", () =>
    ({ select: async () => ({ _id: "membresia" }) }));
  t.mock.method(Apoderado, "findOne", () =>
    ({ select: async () => null }));
  const res = response();
  await requireFamilia(req(), res, error => { throw error; });
  assert.equal(res.code, 404);
});

test("portal solo obtiene vínculos activos de contacto autenticado y filtra otros niños", async t => {
  t.mock.method(Vinculo, "find", filter => {
    assert.equal(String(filter.escuela), String(escuelaId));
    assert.equal(String(filter.apoderado), String(apoderadoId));
    assert.equal(filter.estado, "activo");
    return { select() { return this; }, limit() { return this; },
      async lean() { return [{ jugador: jugadorId }]; } };
  });
  t.mock.method(Jugador, "find", filter => {
    assert.equal(String(filter.escuela), String(escuelaId));
    assert.equal(filter.estado, "activo");
    assert.deepEqual(filter._id.$in, [jugadorId]);
    return { select() { return this; }, populate() { return this; },
      async lean() { return [{ _id: jugadorId, nombre: "Jugador Prueba",
        categoria: { nombre: "Sub 8", modalidad: "formativo" } }]; } };
  });
  t.mock.method(Evento, "find", filter => {
    assert.equal(String(filter.escuela), String(escuelaId));
    assert.equal(filter.cerrado, true);
    assert.deepEqual(filter["registros.jugador"].$in, [jugadorId]);
    return { select() { return this; }, sort() { return this; },
      limit() { return this; },
      async lean() {
        return [{ fechaEvento: new Date("2026-09-23"), tipoEvento: "Entrenamiento",
          registros: [
            { jugador: jugadorId, asistencia: "presente",
              estadisticas: { goles: 2 } },
            { jugador: otroJugadorId, asistencia: "presente",
              estadisticas: { goles: 3 } }
          ] }];
      } };
  });
  const request = {
    familia: {
      escuela: { _id: escuelaId, nombre: "Escuela Ficticia" },
      apoderado: { _id: apoderadoId }
    }
  };
  const res = response();
  await misJugadores(request, res, error => { throw error; });
  assert.equal(res.code, 200);
  assert.equal(res.data.jugadores.length, 1);
  assert.equal(res.data.jugadores[0].ultimasActividades[0].goles, 2);
  assert.ok(!JSON.stringify(res.data).includes(String(otroJugadorId)));
  assert.ok(!JSON.stringify(res.data).includes("rut"));
});
