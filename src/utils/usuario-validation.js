const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCorreo(email) {
  if (typeof email !== "string" || email.length > 254) return null;
  const value = email.trim().toLowerCase();
  return EMAIL.test(value) ? value : null;
}

function validarNombre(nombre) {
  if (typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 120) return null;
  return nombre.trim();
}

function validarPassword(password) {
  return typeof password === "string" && password.length >= 12 && password.length <= 128;
}

module.exports = { validarCorreo, validarNombre, validarPassword };
