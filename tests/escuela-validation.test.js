const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateBranding, validateNewSchool, validateSchoolUpdate, validateSlug
} = require("../src/utils/escuela-validation");

const escuelaId = "507f1f77bcf86cd799439011";

test("escuela válida", () => {
  assert.deepEqual(
    validateNewSchool({ nombre: " Los Leones ", slug: "los-leones" }),
    { nombre: "Los Leones", slug: "los-leones" }
  );
});

test("rechazar campos de administración ajenos", () => {
  assert.throws(() =>
    validateNewSchool({ nombre: "A", slug: "aaa", admin: true }), /no permitidos/
  );
  assert.throws(() => validateSchoolUpdate({ slug: "otro" }), /no permitidos/);
});

test("slug no admite rutas ni caracteres arbitrarios", () => {
  assert.throws(() => validateSlug("../../data"), /inválido/);
  assert.throws(() => validateSlug("Escuela Azul"), /inválido/);
});

test("solo se aceptan colores hex y rutas de imagen internas", () => {
  assert.deepEqual(
    validateBranding({ colorPrimario: "#aabbcc" }, escuelaId),
    { colorPrimario: "#AABBCC" }
  );
  assert.throws(() =>
    validateBranding({ colorPrimario: "red" }, escuelaId), /inválido/
  );
  assert.throws(() =>
    validateBranding({ logoUrl: "https://otro-sitio/logo.svg" }, escuelaId),
    /inválida/
  );
  assert.throws(() =>
    validateBranding({ logoUrl: "/uploads/escuelas/otra/logo.png" }, escuelaId),
    /inválida/
  );
  assert.throws(() =>
    validateBranding({ estado: "activa" }, escuelaId), /no permitidos/
  );
});

test("estado limitado a valores permitidos", () => {
  assert.deepEqual(validateSchoolUpdate({ estado: "suspendida" }),
    { estado: "suspendida" });
  assert.throws(() => validateSchoolUpdate({ estado: "admin" }), /inválido/);
});
