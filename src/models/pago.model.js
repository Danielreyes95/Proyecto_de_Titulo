const mongoose = require("mongoose");

const PagoSchema = new mongoose.Schema(
  {
    jugador: { type: mongoose.Schema.Types.ObjectId, ref: "Jugador", required: true },
    apoderado: { type: mongoose.Schema.Types.ObjectId, ref: "Apoderado", required: true },
    categoria: { type: mongoose.Schema.Types.ObjectId, ref: "Categoria", required: true },
    mes: { type: String, required: true }, // Ej: "Noviembre 2025"
    monto: { type: Number, required: true },
    metodoPago: { type: String, enum: ["App", "Transferencia","Efectivo"], required: true },
    plataforma: { type: String, default: "Interna" }, // Ej: WebPay, MercadoPago, etc.
    estado: { type: String, enum: ["Pendiente", "Pagado"], default: "Pendiente" },
    fechaPago: { type: Date },
    observacion: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pago", PagoSchema);
