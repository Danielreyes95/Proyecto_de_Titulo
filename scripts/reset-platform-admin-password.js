require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const PlatformAdmin = require("../src/models/platform-admin.model");

async function main() {
  const email = (process.env.RESET_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.RESET_ADMIN_PASSWORD || "";
  const confirm = process.env.RESET_ADMIN_CONFIRM || "";

  if (!process.env.MONGO_URI || !email || !email.includes("@") ||
      password.length < 16 || password.length > 1024 ||
      confirm !== "RESET") {
    throw new Error("Configura MONGO_URI, RESET_ADMIN_EMAIL, RESET_ADMIN_PASSWORD >=16 y RESET_ADMIN_CONFIRM=RESET");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const admin = await PlatformAdmin.findOne({ email });
  if (!admin) throw new Error("No existe una cuenta de superadministrador con ese correo");
  if (admin.estado !== "activo") throw new Error("La cuenta existe, pero está inactiva");

  const passwordHash = await bcrypt.hash(password, 12);
  await PlatformAdmin.updateOne(
    { _id: admin._id, estado: "activo" },
    { $set: { passwordHash }, $inc: { tokenVersion: 1 } }
  );

  console.log("Contraseña del superadministrador actualizada. Retira RESET_ADMIN_PASSWORD y RESET_ADMIN_CONFIRM del entorno.");
}

main().catch(error => {
  console.error("No se pudo restablecer la contraseña:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
