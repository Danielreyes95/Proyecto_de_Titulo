const test = require("node:test");
const assert = require("node:assert/strict");
const {
  rutNormalizado, validarJugador, validarApoderado,
  nacimiento, edadAnual
} = require("../src/utils/jugador-escuela-validation");

const categoryId = "507f1f77bcf86cd799439011";

test("RUT chileno con DV normaliza y rechaza valores inválidos", () => {
  assert.equal(rutNormalizado("12.345.678-5"), "12345678-5");
  assert.throws(() => rutNormalizado("12.345.678-4"), /verificador/);
  assert.throws(() => rutNormalizado("otro"), /RUT inválido/);
});

test("jugador registra solo campos explícitos sin credenciales", () => {
  const data = {
    nombre: " Jugador Ejemplo ", rut: "12.345.678-5",
    fechaNacimiento: "2018-05-02", categoriaId: categoryId
  };
  const result = validarJugador(data, true);
  assert.equal(result.nombre, "Jugador Ejemplo");
  assert.equal(result.rut, "12345678-5");
  assert.equal(String(result.categoria), categoryId);
  for (const field of ["escuela", "password", "estado", "apoderado", "$set"]) {
    assert.throws(() => validarJugador({ ...data, [field]: "valor" }, true),
      /no permitidos/);
  }
});

test("apoderado acepta contacto, no credenciales ni escuela arbitraria", () => {
  const data = {
    nombre: " Adulto Ejemplo ", rut: "12.345.678-5",
    email: " CONTACTO@EJEMPLO.CL ", telefono: "+56 9 1234 5678"
  };
  assert.equal(validarApoderado(data).email, "contacto@ejemplo.cl");
  assert.throws(() => validarApoderado({ ...data, password: "123" }),
    /no permitidos/);
});

test("fecha exige calendario real y no permite fechas futuras", () => {
  assert.throws(() => nacimiento("2026-02-30"), /Fecha inválida/);
  assert.throws(() => nacimiento("2999-01-01"), /Fecha inválida/);
});

test("la edad deportiva está definida al primero de enero", () => {
  assert.equal(edadAnual("2018-01-01", new Date("2026-09-23T00:00:00Z")), 8);
  assert.equal(edadAnual("2018-01-02", new Date("2026-09-23T00:00:00Z")), 7);
  assert.equal(edadAnual("2018-12-31", new Date("2026-09-23T00:00:00Z")), 7);
});
