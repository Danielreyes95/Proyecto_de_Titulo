const test = require("node:test");
const assert = require("node:assert/strict");
const { validarCorreo, validarNombre, validarPassword } = require("../src/utils/usuario-validation");

test("normaliza correos de director", () => {
  assert.equal(validarCorreo(" Director@Ejemplo.CL "), "director@ejemplo.cl");
  assert.equal(validarCorreo("invalido"), null);
});

test("rechaza nombres vacíos y claves cortas", () => {
  assert.equal(validarNombre("  " ), null);
  assert.equal(validarNombre(" Directora "), "Directora");
  assert.equal(validarPassword("corta"), false);
  assert.equal(validarPassword("contraseña-larga-de-ejemplo"), true);
});
