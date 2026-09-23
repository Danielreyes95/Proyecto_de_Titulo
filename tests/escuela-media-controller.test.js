const test = require("node:test");
const assert = require("node:assert/strict");
const Escuela = require("../src/models/escuela.model");
const media = require("../src/controllers/escuela-media.controller");

const schoolId = "507f1f77bcf86cd799439011";
const assetId = "507f1f77bcf86cd799439012";
function response() {
  return {
    code: 200, data: null, ended: false,
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; },
    end() { this.ended = true; return this; }
  };
}
test("carga no acepta tipo heredado ni payload arbitrario", async t => {
  t.mock.method(Escuela, "findOne", () =>
    assert.fail("Nunca debe buscar la escuela con tipo inválido"));
  const res = response();
  await media.cargar({
    params: { escuelaId: schoolId, tipo: "__proto__" },
    body: { base64: "AAAA" }
  }, res, error => { throw error; });
  assert.equal(res.code, 400);
});
test("retirada consulta únicamente escuela activa seleccionada", async t => {
  t.mock.method(Escuela, "findOne", filter => {
    assert.equal(filter._id, schoolId);
    assert.equal(filter.estado, "activa");
    return { select: async () => null };
  });
  const res = response();
  await media.quitar({
    params: { escuelaId: schoolId, tipo: "logo" }
  }, res, error => { throw error; });
  assert.equal(res.code, 404);
});
test("archivo no vigente o de escuela suspendida nunca se descarga", async t => {
  t.mock.method(Escuela, "exists", filter => {
    assert.equal(filter._id, schoolId);
    assert.equal(filter.estado, "activa");
    assert.equal(filter["branding.logoUrl"],
      "/uploads/escuelas/" + schoolId + "/logo/" + assetId + ".png");
    return Promise.resolve(null);
  });
  const res = response();
  await media.obtenerPublica({
    params: { escuelaId: schoolId, tipo: "logo", archivo: assetId + ".png" },
    path: "/uploads/escuelas/" + schoolId + "/logo/" + assetId + ".png"
  }, res, error => { throw error; });
  assert.equal(res.code, 404);
  assert.equal(res.ended, true);
});
