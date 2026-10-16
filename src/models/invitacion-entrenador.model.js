const mongoose = require("mongoose");

const InvitacionEntrenadorSchema = new mongoose.Schema({
  escuela: {
    type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true
  },
  entrenador: {
    type: mongoose.Schema.Types.ObjectId, ref: "EscuelaEntrenador",
    required: true, immutable: true
  },
  email: { type: String, required: true, trim: true, lowercase: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId, ref: "Usuario",
    required: true
  }
}, { timestamps: true, collection: "invitaciones_entrenador" });

InvitacionEntrenadorSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });
module.exports = mongoose.model("InvitacionEntrenador", InvitacionEntrenadorSchema);
