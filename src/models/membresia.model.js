const mongoose = require("mongoose");

// Modelo preparatorio: NO reemplaza ni conecta automáticamente los roles
// y colecciones de usuarios actuales. Requiere migración controlada.
const MembresiaSchema = new mongoose.Schema(
  {
    escuela: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escuela",
      required: true,
      index: true
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
      index: true
    },
    rol: {
      type: String,
      enum: ["director", "entrenador", "apoderado"],
      required: true
    },
    estado: {
      type: String,
      enum: ["activa", "suspendida", "inactiva"],
      default: "activa",
      required: true
    }
  },
  { timestamps: true, collection: "membresias" }
);

// Permite más de un rol por usuario y escuela solo si está previsto
// explícitamente, y evita duplicar una misma asignación de rol.
MembresiaSchema.index(
  { escuela: 1, usuario: 1, rol: 1 },
  { unique: true }
);

module.exports = mongoose.model("Membresia", MembresiaSchema);
