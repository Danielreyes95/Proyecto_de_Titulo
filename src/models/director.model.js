const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const DirectorSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  password: { type: String, required: true },
  telefono: { type: String },
  correo: { type: String }
});

// Hashear contraseña
DirectorSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("Director", DirectorSchema, "directores");
