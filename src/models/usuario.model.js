const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  estado: { type: String, enum: ["activo", "inactivo"], default: "activo", required: true },
  tokenVersion: { type: Number, default: 0, required: true }
}, { timestamps: true, collection: "usuarios" });

module.exports = mongoose.model("Usuario", UsuarioSchema);
