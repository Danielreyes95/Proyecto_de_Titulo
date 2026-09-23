const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { crear, cambiarEstado } = require("../src/controllers/escuela-aviso.controller");
const Aviso = require("../src/models/escuela-aviso.model");
const Categoria = require("../src/models/escuela-categoria.model");

const escuela = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const categoria = "507f1f77bcf86cd799439011";
const usuario = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");

function req(body = {}) {
  return { contextoEscuela: { escuela: { _id: escuela } },
    escuelaUsuario: { id: usuario }, body,
    params: { avisoId: "507f1f77bcf86cd799439013" } };
}
function res() {
  return { code: 200, body: null,
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; }
  };
}
test("no publica aviso para categoría ajena o inactiva", async t => {
  t.mock.method(Categoria, "exists", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(filter._id, categoria);
    assert.equal(filter.estado, "activa");
    return Promise.resolve(null);
  });
  t.mock.method(Aviso, "create", () => assert.fail("No debe publicar"));
  const response = res();
  await crear(req({
    titulo: "Entrenamiento", mensaje: "Información de prueba",
    categoriaId: categoria, publicar: true
  }), response, error => { throw error; });
  assert.equal(response.code, 404);
});

test("aviso general queda dentro de la escuela y comienza como borrador", async t => {
  t.mock.method(Aviso, "create", async fields => {
    assert.equal(String(fields.escuela), String(escuela));
    assert.equal(String(fields.creadoPor), String(usuario));
    assert.equal(fields.categoria, null);
    assert.equal(fields.estado, "borrador");
    assert.equal(fields.publicadoEn, null);
    return fields;
  });
  const response = res();
  await crear(req({ titulo:"Aviso general", mensaje:"Mensaje" }),
    response, e => { throw e; });
  assert.equal(response.code, 201);
});

test("cambio de estado siempre filtra aviso por escuela", async t => {
  t.mock.method(Aviso, "findOne", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(filter._id, "507f1f77bcf86cd799439013");
    return Promise.resolve(null);
  });
  const response = res();
  await cambiarEstado(req({ estado:"archivado" }), response,
    e => { throw e; });
  assert.equal(response.code, 404);
});
