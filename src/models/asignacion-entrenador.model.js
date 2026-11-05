const mongoose = require("mongoose");

// Las asignaciones permanecen en el historial al desactivarse.
const AsignacionEntrenadorSchema = new mongoose.Schema({
  escuela: {
    type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true
  },
  entrenador: {
    type: mongoose.Schema.Types.ObjectId, ref: "EscuelaEntrenador",
    required: true, immutable: true
  },
  categoria: {
    type: mongoose.Schema.Types.ObjectId, ref: "EscuelaCategoria",
    required: true, immutable: true
  },
  estado: { type: String, enum: ["activa", "finalizada"], default: "activa", required: true },
  fechaFin: { type: Date, default: null }
}, { timestamps: true, collection: "asignaciones_entrenador" });

// Una categoría dispone de un entrenador principal activo.
// El índice parcial permite conservar el historial de responsables anteriores.
AsignacionEntrenadorSchema.index(
  { escuela: 1, categoria: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: "activa" },
    name: "unique_entrenador_principal_categoria_activa"
  }
);
AsignacionEntrenadorSchema.index(
  { escuela: 1, entrenador: 1, estado: 1 },
  { name: "listado_asignaciones_entrenador" }
);
module.exports = mongoose.model("AsignacionEntrenador", AsignacionEntrenadorSchema);
