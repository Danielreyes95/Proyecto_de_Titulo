require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const PlatformAdmin = require("../src/models/platform-admin.model");

async function main() {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  if (!process.env.MONGO_URI || !email || !email.includes("@") ||
      password.length < 16 || password.length > 1024 ||
      !process.env.PLATFORM_JWT_SECRET ||
      process.env.PLATFORM_JWT_SECRET.length < 32 ||
      process.env.PLATFORM_JWT_SECRET === process.env.JWT_SECRET) {
    throw new Error("Configura MONGO_URI, email, contraseña >=16 y PLATFORM_JWT_SECRET independiente >=32");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const existing = await PlatformAdmin.findOne({ email });
  if (existing) {
    throw new Error("La cuenta ya existe. No se modifica su contraseña por bootstrap.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await PlatformAdmin.create({ email, passwordHash, estado: "activo" });
  console.log("Cuenta de administración creada. Retira BOOTSTRAP_ADMIN_PASSWORD del entorno.");
}

main().catch(error => {
  console.error("No se pudo completar bootstrap:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
