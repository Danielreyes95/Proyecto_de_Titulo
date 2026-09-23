const mongoose = require("mongoose");

// Contacto administrativo sin credenciales: no crea por sí solo acceso al panel.
// Una futura invitación vinculará explícitamente este registro a Usuario.
const EscuelaApoderadoSchema = new mongoose.Schema({
  escuela: { type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true },
  nombre: { type: String, trim: true, required: true, maxlength: 120 },
  rut: { type: String, trim: true, required: true, maxlength: 10 },
  email: { type: String, lowercase: true, trim: true, required: true, maxlength: 254 },
  telefono: { type: String, trim: true, default: null, maxlength: 20 },
  estado: { type: String, enum: ["activo", "inactivo"],
    default: "activo", required: true }
}, { timestamps: true, collection: "escuela_apoderados", optimisticConcurrency: true });

EscuelaApoderadoSchema.index({ escuela: 1, rut: 1 },
  { unique: true, name: "unique_rut_apoderado_por_escuela" });
module.exports = mongoose.model("EscuelaApoderado", EscuelaApoderadoSchema);
