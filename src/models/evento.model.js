const mongoose = require("mongoose");

const EventoSchema = new mongoose.Schema({

  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Categoria",
    required: true
  },

  entrenador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Entrenador",
    required: null
  },

  fechaEvento: {
    type: Date,
    required: true,
    index: true
  },

  tipoEvento: {
    type: String,
    enum: ["Entrenamiento", "Partido", "Torneo"],
    required: true
  },

  descripcion: {
    type: String,
    default: ""
  },

  // 🔥 ASISTENCIA + RENDIMIENTO INTEGRADO
  asistencia: [
    {
      jugador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Jugador",
        required: true
      },

      // Presente / Ausente
      presente: { type: Boolean, required: true },

      // Comentario u observación del entrenador
      observacion: { type: String, default: "" },

      // En caso de inasistencia
      motivoInasistencia: { type: String, default: "" },

      /* --------------------------------------------
         ESTADÍSTICAS TÉCNICAS DEL JUGADOR
      -------------------------------------------- */
      goles: { type: Number, default: 0 },
      asistenciasGol: { type: Number, default: 0 },
      pasesClave: { type: Number, default: 0 },
      recuperaciones: { type: Number, default: 0 },
      tirosArco: { type: Number, default: 0 },
      faltasCometidas: { type: Number, default: 0 },
      faltasRecibidas: { type: Number, default: 0 },

      // Tarjetas
      amarilla: { type: Boolean, default: false },
      roja: { type: Boolean, default: false },

      // NOTA DE RENDIMIENTO GENERAL (1 a 10)
      rendimiento: {
        type: Number,
        min: 1,
        max: 10,
        default: null
      }
    }
  ],

   cerrado: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

// 🚫 Evitar duplicar eventos (misma categoría, fecha y tipo)
EventoSchema.index(
  { categoria: 1, fechaEvento: 1, tipoEvento: 1 },
  { unique: true }
);

module.exports = mongoose.model("Evento", EventoSchema);
