const mongoose = require("mongoose");

// Registro deportivo independiente del evento legacy. Nunca se mezclan escuelas.
const StatsSchema = new mongoose.Schema({
  goles: { type: Number, min: 0, max: 99, default: 0 },
  asistenciasGol: { type: Number, min: 0, max: 99, default: 0 },
  pasesClave: { type: Number, min: 0, max: 99, default: 0 },
  recuperaciones: { type: Number, min: 0, max: 99, default: 0 },
  tirosArco: { type: Number, min: 0, max: 99, default: 0 },
  faltasCometidas: { type: Number, min: 0, max: 99, default: 0 },
  faltasRecibidas: { type: Number, min: 0, max: 99, default: 0 },
  amarilla: { type: Boolean, default: false },
  roja: { type: Boolean, default: false },
  rendimiento: { type: Number, min: 1, max: 10, default: null }
}, { _id: false });

const RegistroSchema = new mongoose.Schema({
  jugador: {
    type: mongoose.Schema.Types.ObjectId, ref: "EscuelaJugador",
    required: true, immutable: true
  },
  // Pendiente no debe convertirse implícitamente en ausente.
  asistencia: {
    type: String, enum: ["pendiente", "presente", "ausente"],
    required: true, default: "pendiente"
  },
  estadisticas: { type: StatsSchema, default: () => ({}) },
  observacion: { type: String, trim: true, maxlength: 500, default: "" }
}, { _id: false });

const EscuelaEventoSchema = new mongoose.Schema({
  escuela: {
    type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true
  },
  categoria: {
    type: mongoose.Schema.Types.ObjectId, ref: "EscuelaCategoria",
    required: true, immutable: true
  },
  fechaEvento: { type: Date, required: true },
  // Hora local informativa, sin convertir la fecha deportiva a UTC.
  horaInicio: { type: String, default: null, match: /^([01]\\d|2[0-3]):[0-5]\\d$/ },
  tipoEvento: {
    type: String, enum: ["Entrenamiento", "Partido", "Torneo"], required: true
  },
  descripcion: { type: String, trim: true, maxlength: 300, default: "" },
  registros: { type: [RegistroSchema], default: [] },
  cerrado: { type: Boolean, default: false, required: true }
}, {
  timestamps: true,
  collection: "escuela_eventos",
  optimisticConcurrency: true
});

EscuelaEventoSchema.index({ escuela: 1, categoria: 1, fechaEvento: -1 });
EscuelaEventoSchema.index(
  { escuela: 1, categoria: 1, fechaEvento: 1, tipoEvento: 1 },
  { unique: true, name: "unique_evento_escuela_fecha_tipo" }
);
module.exports = mongoose.model("EscuelaEvento", EscuelaEventoSchema);
