const { validarNombre, validarCorreo } = require("./usuario-validation");
function bad(message) {
  const e = new Error(message); e.status = 400; throw e;
}
function check(body, allowed, required = []) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.getPrototypeOf(body) !== Object.prototype ||
      !Object.keys(body).length ||
      Object.keys(body).some(key => !allowed.includes(key))) {
    bad("No hay cambios o existen campos no permitidos");
  }
  if (required.some(key => !Object.hasOwn(body, key))) bad("Faltan campos obligatorios");
}
function rutNormalizado(raw) {
  if (typeof raw !== "string") bad("RUT inválido");
  const rut = raw.toUpperCase().replace(/[.\s-]/g, "");
  if (!/^\d{7,8}[0-9K]$/.test(rut)) bad("RUT inválido");
  let sum = 0, factor = 2;
  for (let i = rut.length - 2; i >= 0; i--) {
    sum += Number(rut[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const d = 11 - sum % 11;
  const dv = d === 11 ? "0" : d === 10 ? "K" : String(d);
  if (rut.at(-1) !== dv) bad("Dígito verificador del RUT inválido");
  return rut.slice(0, -1) + "-" + dv;
}
function nacimiento(raw) {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) bad("Fecha inválida");
  const date = new Date(raw + "T12:00:00.000Z");
  if (!Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== raw ||
      date > new Date()) bad("Fecha inválida");
  return date;
}
function id(value) {
  if (typeof value !== "string" || !/^[0-9a-f]{24}$/i.test(value)) bad("Identificador inválido");
  return value;
}
function validarJugador(body, create = false) {
  const allowed = ["nombre", "rut", "fechaNacimiento", "categoriaId"];
  if (!create) allowed.push("estado");
  check(body, allowed, create ? allowed : []);
  const result = {};
  if ("nombre" in body) {
    result.nombre = validarNombre(body.nombre);
    if (!result.nombre) bad("Nombre inválido");
  }
  if ("rut" in body) result.rut = rutNormalizado(body.rut);
  if ("fechaNacimiento" in body) result.fechaNacimiento = nacimiento(body.fechaNacimiento);
  if ("categoriaId" in body) result.categoria = id(body.categoriaId);
  if ("estado" in body) {
    if (!["activo", "inactivo"].includes(body.estado)) bad("Estado inválido");
    result.estado = body.estado;
  }
  return result;
}
function validarApoderado(body) {
  check(body, ["nombre", "rut", "email", "telefono"],
    ["nombre", "rut", "email"]);
  const nombre = validarNombre(body.nombre);
  const email = validarCorreo(body.email);
  if (!nombre || !email) bad("Nombre o correo inválido");
  let telefono = null;
  if ("telefono" in body && body.telefono !== null && body.telefono !== "") {
    if (typeof body.telefono !== "string" ||
        !/^\+?[0-9\s()-]{7,20}$/.test(body.telefono)) bad("Teléfono inválido");
    telefono = body.telefono.trim();
  }
  return { nombre, rut: rutNormalizado(body.rut), email, telefono };
}
function edadAnual(fecha, hoy = new Date()) {
  const nacimiento = new Date(fecha);
  // Regla explícita: edad cumplida al 1 de enero del año en curso.
  return hoy.getUTCFullYear() - nacimiento.getUTCFullYear() -
    ((nacimiento.getUTCMonth() > 0 ||
      (nacimiento.getUTCMonth() === 0 && nacimiento.getUTCDate() > 1)) ? 1 : 0);
}
module.exports = { rutNormalizado, validarJugador, validarApoderado,
  nacimiento, edadAnual, id };
