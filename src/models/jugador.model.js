const mongoose = require("mongoose");

const JugadorSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true }, // RUT del JUGADOR (para login del apoderado)
  nombre: { type: String, required: true },
  fechaNacimiento: { type: Date, required: true },

  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categoria"
  },

  apoderado: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Apoderado",
    required: true
  },

  estado: {
        type: String,
        enum: ["activo", "inactivo"],
        default: "activo"
    }
    
}, { timestamps: true });

module.exports = mongoose.model("Jugador", JugadorSchema, "jugadores");
