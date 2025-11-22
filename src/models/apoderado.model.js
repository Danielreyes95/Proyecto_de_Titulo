const mongoose = require("mongoose");

const ApoderadoSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true },   // RUT del APODERADO
  nombre: { type: String, required: true },
  telefono: { type: String },
  correo: { type: String },

  password: { type: String, required: true },            // Contraseña del apoderado

}, { timestamps: true });

module.exports = mongoose.model("Apoderado", ApoderadoSchema, "apoderados");
