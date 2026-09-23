const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const BRAND_KEYS = new Set([
  "nombrePublico", "logoUrl", "portadaUrl", "colorPrimario",
  "colorSecundario", "colorAcento", "colorTexto"
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function checkKeys(input, allowed) {
  if (!isPlainObject(input)) throw validationError("Se esperaba un objeto JSON");
  if (Object.keys(input).some(key => !allowed.has(key))) {
    throw validationError("Se recibieron campos no permitidos");
  }
}

function validateNombre(value, max = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw validationError("Nombre inválido");
  }
  return value.trim();
}

function validateSlug(value) {
  if (typeof value !== "string" || value.length < 3 || value.length > 64 ||
      !SLUG.test(value)) {
    throw validationError("Identificador de escuela inválido (minúsculas y guiones)");
  }
  return value;
}

function validateBranding(input, escuelaId) {
  checkKeys(input, BRAND_KEYS);
  const branding = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "nombrePublico") {
      branding[key] = validateNombre(value, 100);
    } else if (key.startsWith("color")) {
      if (typeof value !== "string" || !HEX.test(value)) {
        throw validationError(`Color inválido: ${key}`);
      }
      branding[key] = value.toUpperCase();
    } else {
      // Archivos previamente cargados por un futuro endpoint de imágenes.
      // No se aceptan URLs de terceros ni URLs javascript:/data:/SVG.
      const prefix = `/uploads/escuelas/${escuelaId}/`;
      const valid = typeof value === "string" && value.startsWith(prefix) &&
        /^[-a-zA-Z0-9_/]+\.(?:png|jpe?g|webp)$/.test(value.slice(prefix.length)) &&
        !value.includes("..") && value.length <= 500;
      if (value !== null && !valid) {
        throw validationError(`Ruta de imagen inválida: ${key}`);
      }
      branding[key] = value;
    }
  }
  return branding;
}

function validateNewSchool(body) {
  checkKeys(body, new Set(["nombre", "slug"]));
  return { nombre: validateNombre(body.nombre), slug: validateSlug(body.slug) };
}

function validateSchoolUpdate(body) {
  checkKeys(body, new Set(["nombre", "estado"]));
  if (!Object.keys(body).length) throw validationError("No hay cambios");
  const data = {};
  if ("nombre" in body) data.nombre = validateNombre(body.nombre);
  if ("estado" in body) {
    if (!["activa", "suspendida", "inactiva"].includes(body.estado)) {
      throw validationError("Estado inválido");
    }
    data.estado = body.estado;
  }
  return data;
}

module.exports = {
  validateBranding,
  validateNewSchool,
  validateSchoolUpdate,
  validateSlug
};
