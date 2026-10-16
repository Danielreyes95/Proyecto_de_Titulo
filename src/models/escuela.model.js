const mongoose = require("mongoose");

const COLOR_HEX = /^#[0-9A-Fa-f]{6}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const BrandingSchema = new mongoose.Schema(
  {
    nombrePublico: { type: String, trim: true, maxlength: 100 },
    logoUrl: { type: String, trim: true, maxlength: 500, default: null },
    portadaUrl: { type: String, trim: true, maxlength: 500, default: null },
    colorPrimario: {
      type: String,
      default: "#166534",
      validate: { validator: value => COLOR_HEX.test(value), message: "Color primario inválido" }
    },
    colorSecundario: {
      type: String,
      default: "#FFFFFF",
      validate: { validator: value => COLOR_HEX.test(value), message: "Color secundario inválido" }
    },
    colorAcento: {
      type: String,
      default: "#F59E0B",
      validate: { validator: value => COLOR_HEX.test(value), message: "Color de acento inválido" }
    },
    colorTexto: {
      type: String,
      default: "#111827",
      validate: { validator: value => COLOR_HEX.test(value), message: "Color de texto inválido" }
    }
  },
  { _id: false }
);

const EscuelaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 64,
      validate: { validator: value => SLUG.test(value), message: "Slug inválido" }
    },
    estado: {
      type: String,
      enum: ["activa", "suspendida", "inactiva"],
      default: "activa",
      required: true
    },
    branding: { type: BrandingSchema, default: () => ({}) }
  },
  { timestamps: true, collection: "escuelas" }
);

module.exports = mongoose.model("Escuela", EscuelaSchema);
