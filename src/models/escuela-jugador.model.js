const mongoose = require("mongoose");

// Separado de la colección legacy "jugadores": no ejecutar migraciones implícitas.
const EscuelaJugadorSchema = new mongoose.Schema({
  escuela: { type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true },
  nombre: { type: String, trim: true, required: true, maxlength: 120 },
  rut: { type: String, trim: true, required: true, maxlength: 10 },
  fechaNacimiento: { type: Date, required: true },
  categoria: { type: mongoose.Schema.Types.ObjectId, ref: "EscuelaCategoria",
    required: true },
  estado: { type: String, enum: ["activo", "inactivo"],
    default: "activo", required: true }
}, { timestamps: true, collection: "escuela_jugadores", optimisticConcurrency: true });

EscuelaJugadorSchema.index({ escuela: 1, rut: 1 },
  { unique: true, name: "unique_rut_jugador_por_escuela" });
EscuelaJugadorSchema.index({ escuela: 1, categoria: 1, estado: 1 });
module.exports = mongoose.model("EscuelaJugador", EscuelaJugadorSchema);
