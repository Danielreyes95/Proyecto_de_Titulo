const mongoose = require("mongoose");

const CategoriaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  edadMin: { type: Number, required: true },
  edadMax: { type: Number, required: true },
  entrenador: { type: mongoose.Schema.Types.ObjectId, ref: "Entrenador", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Categoria", CategoriaSchema,"categorias");
