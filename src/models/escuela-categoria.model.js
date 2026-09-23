const mongoose = require("mongoose");

// Colección nueva, aislada de la colección legacy "categorias" hasta
// realizar una migración respaldada y verificable.
const EscuelaCategoriaSchema = new mongoose.Schema({
  escuela: {
    type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true
  },
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  nombreClave: { type: String, required: true, trim: true, maxlength: 80 },
  modalidad: {
    type: String, enum: ["formativo", "competitivo"], required: true
  },
  edadMin: { type: Number, required: true, min: 0, max: 99 },
  edadMax: { type: Number, required: true, min: 0, max: 99 },
  cupos: { type: Number, min: 1, max: 500, default: null },
  estado: { type: String, enum: ["activa", "inactiva"], default: "activa", required: true }
}, { timestamps: true, collection: "escuela_categorias" });

// Dos escuelas pueden tener categorías idénticas; una misma escuela puede
// tener modalidad competitiva y formativa con el mismo nombre.
EscuelaCategoriaSchema.index(
  { escuela: 1, nombreClave: 1, modalidad: 1 },
  { unique: true, name: "unique_categoria_por_escuela_modalidad" }
);

EscuelaCategoriaSchema.pre("validate", function(next) {
  if (Number.isInteger(this.edadMin) && Number.isInteger(this.edadMax) &&
      this.edadMin > this.edadMax) {
    this.invalidate("edadMax", "Edad máxima debe ser mayor o igual a mínima");
  }
  next();
});

module.exports = mongoose.model("EscuelaCategoria", EscuelaCategoriaSchema);
