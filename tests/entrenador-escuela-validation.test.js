const test = require("node:test");
const assert = require("node:assert/strict");
const { validarEntrenador, validarAsignacion } =
  require("../src/utils/entrenador-escuela-validation");

test("un entrenador nuevo admite nombre y email normalizado", () => {
  assert.deepEqual(validarEntrenador({
    nombre: "  Andrea Silva ", email: " ANDREA@EJEMPLO.CL "
  }, true), { nombre: "Andrea Silva", email: "andrea@ejemplo.cl" });
});

test("no permite crear entrenador con escuela, rol, password ni estado arbitrario", () => {
  const valid = { nombre: "Andrea", email: "andrea@ejemplo.cl" };
  for (const key of ["escuela", "escuelaId", "password", "rut", "rol", "estado"]) {
    assert.throws(() => validarEntrenador({ ...valid, [key]: "arbitrario" }, true),
      /no permitidos/);
  }
});

test("actualiza solo campos autorizados y valida estado", () => {
  assert.deepEqual(validarEntrenador({ estado: "inactivo" }), { estado: "inactivo" });
  assert.throws(() => validarEntrenador({ estado: "eliminado" }), /Estado inválido/);
  assert.throws(() => validarEntrenador({}), /No hay cambios/);
});

test("la asignación solo permite ID de categoría válido", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.equal(validarAsignacion({ categoriaId: id }), id);
  assert.throws(() => validarAsignacion({ categoriaId: "otra" }), /categoría válida/);
  assert.throws(() =>
    validarAsignacion({ categoriaId: id, escuelaId: id }), /categoría válida/);
});
