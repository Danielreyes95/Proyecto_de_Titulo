const mongoose = require("mongoose");

const AvisoSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    tipo: {
      type: String,
      enum: ["Torneo", "Entrenamiento", "General"],
      default: "General"
    },

    destinatario: {
      type: String,
      enum: [
        "Todos",
        "Apoderados",
        "Entrenadores",
        "EntrenadorEspecifico",  // 🔵 agregado
        "ApoderadoEspecifico"    // 🔵 agregado
      ],
      default: "Todos"
    },

    // 🟦 Nuevo campo para guardar el ID del destinatario específico
    destinatarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null
    },

    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categoria",
      default: null
    },

    creadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entrenador",    
      default: null
    },

    fechaEvento: { type: Date },
    contenido: { type: String, required: true },

    estado: {
      type: String,
      enum: ["Vigente", "Archivado"],
      default: "Vigente"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Aviso", AvisoSchema);
