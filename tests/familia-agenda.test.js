const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { agenda } = require("../src/controllers/familia-agenda.controller");
const Vinculo = require("../src/models/vinculo-jugador-apoderado.model");
const Jugador = require("../src/models/escuela-jugador.model");
const Evento = require("../src/models/escuela-evento.model");
const Aviso = require("../src/models/escuela-aviso.model");
const escuela = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const apoderado = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
const jugador = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
const otro = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
const categoria = new mongoose.Types.ObjectId("507f1f77bcf86cd799439014");
const otraCategoria = new mongoose.Types.ObjectId("507f1f77bcf86cd799439015");

function req() { return { familia: {
  escuela: { _id: escuela }, apoderado: { _id: apoderado }
} }; }
function res() { return { body:null, json(value){this.body=value;return this;} }; }
function chain(items) {return {
  select(){return this;}, sort(){return this;}, limit(){return this;},
  async lean(){return items;}
};}

test("sin vínculo activo no consulta agenda ni avisos institucionales", async t => {
  t.mock.method(Vinculo, "find", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(String(filter.apoderado), String(apoderado));
    return chain([]);
  });
  t.mock.method(Evento, "find", () => assert.fail("Sin jugadores no hay consulta"));
  t.mock.method(Aviso, "find", () => assert.fail("Sin jugadores no hay avisos"));
  const response = res();
  await agenda(req(), response, e => {throw e;});
  assert.deepEqual(response.body, {proximasActividades:[], avisos:[]});
});

test("agenda filtra escuela, jugadores y categorías y no muestra otra nómina", async t => {
  t.mock.method(Vinculo, "find", () => chain([{jugador}]));
  t.mock.method(Jugador, "find", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.deepEqual(filter._id.$in, [jugador]);
    assert.equal(filter.estado, "activo");
    return chain([{_id: jugador, nombre:"Jugador vinculado", categoria}]);
  });
  t.mock.method(Evento, "find", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(filter.cerrado, false);
    assert.deepEqual(filter["registros.jugador"].$in, [jugador]);
    assert.deepEqual(filter.categoria.$in, [String(categoria)]);
    assert.ok(filter.fechaEvento.$gte instanceof Date);
    return chain([
      {_id:new mongoose.Types.ObjectId(), tipoEvento:"Partido",
        categoria, fechaEvento:new Date("2099-09-23T12:00:00.000Z"),
        horaInicio:"18:30", registros:[{jugador},{jugador:otro}]},
      {_id:new mongoose.Types.ObjectId(), tipoEvento:"Entrenamiento",
        categoria:otraCategoria, fechaEvento:new Date("2099-09-24T12:00:00.000Z"),
        registros:[{jugador}]}
    ]);
  });
  t.mock.method(Aviso, "find", filter => {
    assert.equal(String(filter.escuela), String(escuela));
    assert.equal(filter.estado, "publicado");
    assert.deepEqual(filter.categoria.$in, [null,String(categoria)]);
    return chain([
      {_id:new mongoose.Types.ObjectId(),titulo:"General",mensaje:"Información",
        categoria:null, publicadoEn:new Date()},
      {_id:new mongoose.Types.ObjectId(),titulo:"Categoría",mensaje:"Aviso",
        categoria, publicadoEn:new Date()}
    ]);
  });
  const response=res(); await agenda(req(),response,e=>{throw e;});
  assert.equal(response.body.proximasActividades.length,1);
  assert.deepEqual(response.body.proximasActividades[0].jugadores,
    ["Jugador vinculado"]);
  assert.equal(response.body.avisos.length,2);
  assert.ok(!JSON.stringify(response.body).includes("Jugador ajeno"));
  assert.ok(!JSON.stringify(response.body).includes(String(otro)));
});
