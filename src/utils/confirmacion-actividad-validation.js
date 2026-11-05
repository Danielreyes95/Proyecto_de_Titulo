const ESTADOS = Object.freeze(["pendiente", "asistira", "no_asistira"]);
function validarConfirmacion(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.getPrototypeOf(body) !== Object.prototype ||
      Object.keys(body).length !== 1 ||
      !Object.hasOwn(body, "estado") || !ESTADOS.includes(body.estado)) {
    const error = new Error("Confirma si asistirá, no asistirá o deja pendiente");
    error.status = 400;
    throw error;
  }
  return body.estado;
}
module.exports = { ESTADOS, validarConfirmacion };
