const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const EntrenadorSchema = new mongoose.Schema(
  {
    nombre: { 
      type: String, 
      required: true 
    },

    rut: { 
      type: String, 
      required: true, 
      unique: true 
    },

    password: { 
      type: String, 
      required: true 
    },

    telefono: { 
      type: String, 
      required: true 
    },

    correo: { 
      type: String, 
      required: true, 
      unique: true 
    },

    estado: {
      type: String,
      enum: ["activo", "inactivo"],
      default: "activo"
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
      default: null
    }
  },
  { timestamps: true }
);

// Encriptar contraseña antes de guardar
EntrenadorSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("Entrenador", EntrenadorSchema, "entrenadores");
