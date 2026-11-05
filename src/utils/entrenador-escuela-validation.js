const { validarCorreo, validarNombre } = require("./usuario-validation");

function bad(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function validarEntrenador(body, creating = false) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.getPrototypeOf(body) !== Object.prototype) bad("Se requiere un objeto JSON");
  const allowed = creating ? ["nombre", "email"] : ["nombre", "email", "estado"];
  const keys = Object.keys(body);
  if (!keys.length || keys.some(key => !allowed.includes(key))) {
    bad("No hay cambios o existen campos no permitidos");
  }
  if (creating && !["nombre", "email"].every(key => key in body)) {
    bad("Nombre y correo son obligatorios");
  }
  const result = {};
  if ("nombre" in body) {
    result.nombre = validarNombre(body.nombre);
    if (!result.nombre) bad("Nombre de entrenador inválido");
  }
  if ("email" in body) {
    result.email = validarCorreo(body.email);
    if (!result.email) bad("Correo de entrenador inválido");
  }
  if ("estado" in body) {
    if (!["activo", "inactivo"].includes(body.estado)) bad("Estado inválido");
    result.estado = body.estado;
  }
  return result;
}

function validarAsignacion(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.keys(body).length !== 1 || !Object.hasOwn(body, "categoriaId") ||
      typeof body.categoriaId !== "string" || !/^[0-9a-f]{24}$/i.test(body.categoriaId)) {
    bad("Indica una categoría válida");
  }
  return body.categoriaId;
}

module.exports = { validarEntrenador, validarAsignacion };
