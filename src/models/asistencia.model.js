const mongoose = require("mongoose");

const AsistenciaSchema = new mongoose.Schema({

  jugador: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Jugador", 
    required: true,
    index: true
  },

  entrenador: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Entrenador", 
    required: true 
  },

  categoria: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Categoria", 
    required: true,
    index: true
  },

  tipoEvento: { 
    type: String, 
    enum: ["Entrenamiento", "Partido", "Torneo"], 
    required: true 
  },

  fechaEvento: { 
    type: Date, 
    required: true,
    index: true 
  },

  asistencia: { 
    type: Boolean, 
    required: true 
  }, // true = asistió, false = ausente

  comentario: { type: String }

}, { timestamps: true });


// 🚀 Índice compuesto para evitar registro duplicado
// Un jugador no puede tener 2 registros el mismo día para la misma categoría y evento
AsistenciaSchema.index(
  { jugador: 1, categoria: 1, fechaEvento: 1, tipoEvento: 1 },
  { unique: true }
);

module.exports = mongoose.model("Asistencia", AsistenciaSchema);
