const mongoose = require("mongoose");

// Avisos visibles solo en el portal de familias de esta institución.
const EscuelaAvisoSchema = new mongoose.Schema({
  escuela: { type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true },
  categoria: { type: mongoose.Schema.Types.ObjectId,
    ref: "EscuelaCategoria", default: null },
  titulo: { type: String, required: true, trim: true, maxlength: 120 },
  mensaje: { type: String, required: true, trim: true, maxlength: 1000 },
  estado: { type: String, enum: ["borrador", "publicado", "archivado"],
    required: true, default: "borrador" },
  publicadoEn: { type: Date, default: null },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario",
    required: true, immutable: true }
}, { timestamps: true, collection: "escuela_avisos", optimisticConcurrency: true });

EscuelaAvisoSchema.index({ escuela: 1, estado: 1, publicadoEn: -1 });
EscuelaAvisoSchema.index({ escuela: 1, categoria: 1, estado: 1 });
module.exports = mongoose.model("EscuelaAviso", EscuelaAvisoSchema);
