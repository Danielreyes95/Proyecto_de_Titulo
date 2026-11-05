const mongoose = require("mongoose");

// Personal de cada institución; NO reutiliza los usuarios/contraseñas legacy.
// La cuenta de acceso de entrenador se incorporará con invitación y membresía.
const EscuelaEntrenadorSchema = new mongoose.Schema({
  escuela: {
    type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true
  },
  nombre: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  estado: {
    type: String, enum: ["activo", "inactivo"], required: true, default: "activo"
  }
}, { timestamps: true, collection: "escuela_entrenadores", optimisticConcurrency: true });

// Un correo puede trabajar para más de una escuela.
EscuelaEntrenadorSchema.index(
  { escuela: 1, email: 1 },
  { unique: true, name: "unique_entrenador_email_por_escuela" }
);
module.exports = mongoose.model("EscuelaEntrenador", EscuelaEntrenadorSchema);
