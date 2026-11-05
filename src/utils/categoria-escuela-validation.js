const MODALIDADES = new Set(["formativo", "competitivo"]);
const ESTADOS = new Set(["activa", "inactiva"]);
const CREATE_FIELDS = new Set(["nombre", "modalidad", "edadMin", "edadMax", "cupos"]);
const UPDATE_FIELDS = new Set([...CREATE_FIELDS, "estado"]);

function bad(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function assertPlain(body, allowed) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.getPrototypeOf(body) !== Object.prototype) bad("Se requiere un objeto JSON");
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some(key => !allowed.has(key))) {
    bad("No hay cambios o existen campos no permitidos");
  }
}

function nombreClave(nombre) {
  return nombre.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es-CL");
}

function validarCampos(body, create = false) {
  assertPlain(body, create ? CREATE_FIELDS : UPDATE_FIELDS);
  if (create && ["nombre", "modalidad", "edadMin", "edadMax"]
    .some(key => !(key in body))) bad("Faltan campos obligatorios");

  const result = {};
  if ("nombre" in body) {
    if (typeof body.nombre !== "string") bad("Nombre de categoría inválido");
    const nombre = body.nombre.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!nombre || nombre.length > 80) bad("Nombre de categoría inválido");
    result.nombre = nombre;
    result.nombreClave = nombreClave(nombre);
  }
  if ("modalidad" in body) {
    if (!MODALIDADES.has(body.modalidad)) bad("Modalidad inválida");
    result.modalidad = body.modalidad;
  }
  for (const key of ["edadMin", "edadMax"]) {
    if (key in body) {
      if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > 99) {
        bad("Edad inválida: " + key);
      }
      result[key] = body[key];
    }
  }
  if ("cupos" in body) {
    if (body.cupos !== null && (!Number.isInteger(body.cupos) ||
        body.cupos < 1 || body.cupos > 500)) bad("Cupos inválidos");
    result.cupos = body.cupos;
  }
  if ("estado" in body) {
    if (!ESTADOS.has(body.estado)) bad("Estado inválido");
    result.estado = body.estado;
  }
  if (create && result.edadMin > result.edadMax) {
    bad("La edad mínima no puede superar a la máxima");
  }
  if (create) result.estado = "activa";
  return result;
}

function validarRangoFinal(actual, cambios) {
  const min = cambios.edadMin ?? actual.edadMin;
  const max = cambios.edadMax ?? actual.edadMax;
  if (min > max) bad("La edad mínima no puede superar a la máxima");
}

module.exports = { validarCampos, validarRangoFinal, nombreClave };
