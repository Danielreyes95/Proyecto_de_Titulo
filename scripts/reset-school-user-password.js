// Recuperación administrativa LOCAL de una cuenta de Director/Entrenador.
// No habilitar como endpoint HTTP: requiere acceso autorizado a la BD de pruebas.
require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Escuela = require("../src/models/escuela.model");
const Usuario = require("../src/models/usuario.model");
const Membresia = require("../src/models/membresia.model");

async function main() {
  const email = (process.env.RESET_SCHOOL_EMAIL || "").trim().toLowerCase();
  const slug = (process.env.RESET_SCHOOL_SLUG || "").trim().toLowerCase();
  const password = process.env.RESET_SCHOOL_PASSWORD || "";
  const confirm = process.env.RESET_SCHOOL_CONFIRM || "";
  const uri = process.env.MONGO_URI || "";

  if (process.env.NODE_ENV === "production") {
    throw new Error("Esta operación se permite solo en desarrollo local");
  }
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  const database = (() => {
    try { return decodeURIComponent(new URL(uri).pathname.replace(/^\//, "")); }
    catch { return ""; }
  })();

  if (!validEmail || !validSlug || password.length < 16 ||
      password.length > 1024 || confirm !== "RESET" ||
      database !== "plataforma_futbol_test") {
    throw new Error(
      "Configura RESET_SCHOOL_EMAIL, RESET_SCHOOL_SLUG, " +
      "RESET_SCHOOL_PASSWORD (16+ caracteres), RESET_SCHOOL_CONFIRM=RESET " +
      "y MONGO_URI hacia plataforma_futbol_test"
    );
  }
  await mongoose.connect(uri);
  const escuela = await Escuela.findOne({ slug, estado: "activa" }).select("_id");
  if (!escuela) throw new Error("La escuela indicada no existe o no está activa");

  const user = await Usuario.findOne({ email, estado: "activo" }).select("_id tokenVersion");
  if (!user) throw new Error("No hay una cuenta activa con ese correo");

  const membership = await Membresia.exists({
    escuela: escuela._id, usuario: user._id,
    rol: { $in: ["director", "entrenador"] }, estado: "activa"
  });
  if (!membership) {
    throw new Error("Ese usuario no tiene una membresía activa de Dirección/Entrenador en esta escuela");
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await Usuario.updateOne(
    { _id: user._id, estado: "activo" },
    { $set: { passwordHash: hash }, $inc: { tokenVersion: 1 } }
  );
  if (result.matchedCount !== 1) throw new Error("No se actualizó ninguna cuenta");

  console.log("Contraseña actualizada para el usuario autorizado. Se invalidaron sus sesiones anteriores.");
  console.log("Elimina RESET_SCHOOL_EMAIL, RESET_SCHOOL_SLUG, RESET_SCHOOL_PASSWORD y RESET_SCHOOL_CONFIRM de .env.");
}
main().catch(error => {
  console.error("No se pudo recuperar el acceso:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
