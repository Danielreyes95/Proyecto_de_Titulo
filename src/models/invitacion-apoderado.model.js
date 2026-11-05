const mongoose = require("mongoose");

const InvitacionApoderadoSchema = new mongoose.Schema({
  escuela: { type: mongoose.Schema.Types.ObjectId, ref: "Escuela",
    required: true, immutable: true, index: true },
  apoderado: { type: mongoose.Schema.Types.ObjectId, ref: "EscuelaApoderado",
    required: true, immutable: true },
  email: { type: String, required: true, lowercase: true, trim: true,
    maxlength: 254, immutable: true },
  tokenHash: { type: String, required: true, select: false, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true }
}, { timestamps: true, collection: "invitaciones_apoderado" });
InvitacionApoderadoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });
module.exports = mongoose.model("InvitacionApoderado", InvitacionApoderadoSchema);
