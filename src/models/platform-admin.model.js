const mongoose = require("mongoose");

// Cuentas creadas EXCLUSIVAMENTE por el script de arranque; no hay registro público.
const PlatformAdminSchema = new mongoose.Schema(
  {
    email: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
      maxlength: 254
    },
    passwordHash: { type: String, required: true, select: false },
    estado: { type: String, enum: ["activo", "inactivo"], default: "activo" },
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true, collection: "platform_admins" }
);

module.exports = mongoose.model("PlatformAdmin", PlatformAdminSchema);
