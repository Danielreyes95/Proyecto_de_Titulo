const test = require("node:test");
const assert = require("node:assert/strict");
const { validarCampos, validarRangoFinal, nombreClave } =
  require("../src/utils/categoria-escuela-validation");

test("dos modalidades con nombres normalizados iguales se identifican de forma estable", () => {
  assert.equal(nombreClave("  Sub  8 "), "sub 8");
  assert.deepEqual(validarCampos({
    nombre: " Sub  8 ", modalidad: "formativo", edadMin: 7, edadMax: 8, cupos: 30
  }, true), {
    nombre: "Sub 8", nombreClave: "sub 8", modalidad: "formativo",
    edadMin: 7, edadMax: 8, cupos: 30, estado: "activa"
  });
});

test("rechaza ID de escuela, entrenador y estado enviados al crear", () => {
  const base = { nombre: "Sub 8", modalidad: "formativo", edadMin: 7, edadMax: 8 };
  for (const key of ["escuela", "escuelaId", "entrenador", "estado", "$set"]) {
    assert.throws(() => validarCampos({ ...base, [key]: "arbitrario" }, true),
      /no permitidos/);
  }
});

test("no acepta modalidades o edades incorrectas", () => {
  assert.throws(() => validarCampos({
    nombre: "Sub 8", modalidad: "todos", edadMin: 7, edadMax: 8
  }, true), /Modalidad/);
  assert.throws(() => validarCampos({
    nombre: "Sub 8", modalidad: "formativo", edadMin: 9, edadMax: 8
  }, true), /edad mínima/);
  assert.throws(() => validarCampos({
    nombre: "Sub 8", modalidad: "formativo", edadMin: "7", edadMax: 8
  }, true), /Edad inválida/);
});

test("edición parcial comprueba rango frente a valores ya guardados", () => {
  assert.throws(() => validarRangoFinal(
    { edadMin: 7, edadMax: 8 }, { edadMin: 9 }), /edad mínima/);
  assert.doesNotThrow(() => validarRangoFinal(
    { edadMin: 7, edadMax: 8 }, { edadMin: 5 }));
  assert.deepEqual(validarCampos({ estado: "inactiva" }), { estado: "inactiva" });
});

test("evita sobrescritura masiva y mantiene exclusión lógica", () => {
  assert.throws(() => validarCampos({ escuela: "otra" }), /no permitidos/);
  assert.throws(() => validarCampos({ estado: "eliminada" }), /Estado inválido/);
  assert.throws(() => validarCampos({}), /No hay cambios/);
});
