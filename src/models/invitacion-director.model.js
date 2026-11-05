const mongoose = require("mongoose");

const InvitacionDirectorSchema = new mongoose.Schema({
  escuela: { type: mongoose.Schema.Types.ObjectId, ref: "Escuela", required: true, index: true },
  email: { type: String, lowercase: true, trim: true, required: true, maxlength: 254 },
  nombre: { type: String, trim: true, required: true, maxlength: 120 },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "PlatformAdmin", required: true }
}, { timestamps: true, collection: "invitaciones_director" });

InvitacionDirectorSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 });
module.exports = mongoose.model("InvitacionDirector", InvitacionDirectorSchema);
