const mongoose = require("mongoose");

// Contacto administrativo sin credenciales: no crea por sí solo acceso al panel.
// Una futura invitación vinculará explícitamente este registro a Usuario.
const EscuelaApoderadoSchema = new mongoose.Schema({
  escuela: { type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true },
  nombre: { type: String, trim: true, required: true, maxlength: 120 },
  // Se asigna exclusivamente tras aceptar una invitación al correo registrado.
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
  rut: { type: String, trim: true, required: true, maxlength: 10 },
  email: { type: String, lowercase: true, trim: true, required: true, maxlength: 254 },
  telefono: { type: String, trim: true, default: null, maxlength: 20 },
  estado: { type: String, enum: ["activo", "inactivo"],
    default: "activo", required: true }
}, { timestamps: true, collection: "escuela_apoderados", optimisticConcurrency: true });

EscuelaApoderadoSchema.index({ escuela: 1, rut: 1 },
  { unique: true, name: "unique_rut_apoderado_por_escuela" });
EscuelaApoderadoSchema.index({ escuela: 1, usuario: 1 },
  { unique: true, partialFilterExpression: { usuario: { $type: "objectId" } },
    name: "unique_usuario_apoderado_por_escuela" });
module.exports = mongoose.model("EscuelaApoderado", EscuelaApoderadoSchema);
