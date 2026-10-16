const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { confirmar } = require("../src/controllers/familia-confirmacion.controller");
const { validarConfirmacion } = require("../src/utils/confirmacion-actividad-validation");
const Jugador = require("../src/models/escuela-jugador.model");
const Vinculo = require("../src/models/vinculo-jugador-apoderado.model");
const Evento = require("../src/models/escuela-evento.model");

const escuela = new mongoose.Types.ObjectId("507f1f77bcf86cd799439010");
const apoderado = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
const jugador = new mongoose.Types.ObjectId("507f1f77bcf86cd799439012");
const categoria = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
const eventoId = "507f1f77bcf86cd799439014";
function req(estado="asistira") {
  return {
    params:{ eventoId, jugadorId:String(jugador) },
    familia:{ escuela:{_id:escuela}, apoderado:{_id:apoderado} },
    body:{estado}
  };
}
function res(){return {
  code:200,body:null,status(code){this.code=code;return this;},
  json(body){this.body=body;return this;}
};}
test("estados permitidos y no aceptar campos ocultos de asistencia real",()=>{
  for(const estado of ["pendiente","asistira","no_asistira"]){
    assert.equal(validarConfirmacion({estado}),estado);
  }
  assert.throws(()=>validarConfirmacion({estado:"presente"}),/Confirma/);
  assert.throws(()=>validarConfirmacion({
    estado:"asistira", asistencia:"presente"
  }),/Confirma/);
  assert.throws(()=>validarConfirmacion({__proto__:null}),/Confirma/);
});
test("sin vínculo apoderado-jugador no se escribe ninguna confirmación",async t=>{
  t.mock.method(Jugador,"findOne",filter=>{
    assert.equal(String(filter.escuela),String(escuela));
    assert.equal(String(filter._id),String(jugador));
    return {select:async()=>({_id:jugador,categoria})};
  });
  t.mock.method(Vinculo,"exists",filter=>{
    assert.equal(String(filter.escuela),String(escuela));
    assert.equal(String(filter.apoderado),String(apoderado));
    assert.equal(String(filter.jugador),String(jugador));
    return Promise.resolve(null);
  });
  t.mock.method(Evento,"findOneAndUpdate",()=>assert.fail("No escribir"));
  const response=res();await confirmar(req(),response,e=>{throw e});
  assert.equal(response.code,404);
});
test("actualización filtra escuela, evento abierto y categoría actual",async t=>{
  t.mock.method(Jugador,"findOne",()=>({
    select:async()=>({_id:jugador,categoria})
  }));
  t.mock.method(Vinculo,"exists",()=>Promise.resolve({_id:apoderado}));
  t.mock.method(Evento,"findOneAndUpdate",(filter,change,options)=>{
    assert.equal(String(filter.escuela),String(escuela));
    assert.equal(filter._id,eventoId);
    assert.equal(filter.cerrado,false);
    assert.equal(String(filter.categoria),String(categoria));
    assert.equal(String(filter["registros.jugador"]),String(jugador));
    assert.ok(filter.fechaEvento.$gte instanceof Date);
    assert.equal(change.$set["registros.$[registro].confirmacion"],"no_asistira");
    assert.equal(change.$inc.__v,1);
    assert.equal(String(options.arrayFilters[0]["registro.jugador"]),String(jugador));
    return {select:async()=>({_id:eventoId})};
  });
  const response=res();await confirmar(req("no_asistira"),response,e=>{throw e});
  assert.equal(response.code,200);
  assert.equal(response.body.estado,"no_asistira");
});
test("actividad cerrada, pasada o de otra institución no admite confirmación",async t=>{
  t.mock.method(Jugador,"findOne",()=>({
    select:async()=>({_id:jugador,categoria})
  }));
  t.mock.method(Vinculo,"exists",()=>Promise.resolve({_id:apoderado}));
  t.mock.method(Evento,"findOneAndUpdate",()=>({
    select:async()=>null
  }));
  const response=res();await confirmar(req(),response,e=>{throw e});
  assert.equal(response.code,404);
});
