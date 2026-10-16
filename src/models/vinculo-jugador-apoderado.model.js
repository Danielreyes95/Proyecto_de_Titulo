const mongoose = require("mongoose");

const VinculoSchema = new mongoose.Schema({
  escuela: { type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true },
  jugador: { type: mongoose.Schema.Types.ObjectId, ref: "EscuelaJugador",
    required: true, immutable: true },
  apoderado: { type: mongoose.Schema.Types.ObjectId, ref: "EscuelaApoderado",
    required: true, immutable: true },
  estado: { type: String, enum: ["activo", "inactivo"], default: "activo" }
}, { timestamps: true, collection: "vinculos_jugador_apoderado" });

VinculoSchema.index({ escuela: 1, jugador: 1, apoderado: 1 },
  { unique: true, name: "unique_vinculo_por_escuela" });
VinculoSchema.index({ escuela: 1, apoderado: 1, estado: 1 });
module.exports = mongoose.model("VinculoJugadorApoderado", VinculoSchema);
