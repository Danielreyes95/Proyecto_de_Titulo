// src/controllers/mp.controller.js
const mercadopago = require("mercadopago");
const Pago = require("../models/pago.model");

// ============================================
// CONFIG MERCADO PAGO
// ============================================
if (!process.env.MP_ACCESS_TOKEN) {
  console.error("⚠️ MP_ACCESS_TOKEN NO definido en variables de entorno");
}

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

// ============================================
// CREAR PREFERENCIA
// ============================================
exports.crearPreferencia = async (req, res) => {
  try {
    const {
      monto,
      descripcion,
      idPago,
      emailApoderado,
      jugadorId,
      apoderadoId,
      categoriaId,
      mes,
    } = req.body;

    if (!monto) {
      return res.status(400).json({ message: "Falta el monto del pago" });
    }

    // Para debug rápido
    console.log("🧾 Crear preferencia MP:", {
      monto,
      descripcion,
      idPago,
      emailApoderado,
      jugadorId,
      apoderadoId,
      categoriaId,
      mes,
      FRONTEND_URL: process.env.FRONTEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
    });

    const preference = {
      items: [
        {
          title:
            descripcion ||
            (mes ? `Mensualidad ${mes}` : "Mensualidad Escuela de Fútbol"),
          quantity: 1,
          currency_id: "CLP",
          unit_price: Number(monto),
        },
      ],

      // correo del pagador (opcional)
      payer: emailApoderado ? { email: emailApoderado } : undefined,

      back_urls: {
        success: `${process.env.FRONTEND_URL}/jugador/pago-exitoso.html`,
        failure: `${process.env.FRONTEND_URL}/jugador/pago-fallido.html`,
        pending: `${process.env.FRONTEND_URL}/jugador/pago-pendiente.html`,
      },

      auto_return: "approved",

      // URL pública de tu backend para recibir el webhook
      notification_url: `${process.env.BACKEND_URL}/api/mercado-pago/webhook`,

      // Info para poder identificar el pago local
      // Caso 1: viene idPago directamente
      // Caso 2: armamos jugadorId|apoderadoId|categoriaId|mes
      external_reference: idPago
        ? String(idPago)
        : jugadorId && mes
        ? [jugadorId, apoderadoId || "", categoriaId || "", mes].join("|")
        : "",
    };

    const response = await mercadopago.preferences.create(preference);
    const body = response?.body || response;

    console.log("✅ MP preference creada:", {
      id: body?.id,
      init_point: body?.init_point,
      sandbox_init_point: body?.sandbox_init_point,
    });

    if (!body || !body.init_point) {
      console.error("⚠️ Mercado Pago no devolvió init_point:", body);
      return res
        .status(500)
        .json({ message: "Mercado Pago no devolvió la URL de pago" });
    }

    return res.json({
      id: body.id,
      init_point: body.init_point,
      sandbox_init_point: body.sandbox_init_point,
    });
  } catch (error) {
    console.error("❌ Error crear preferencia:", error);
    return res.status(500).json({
      message: "Error al crear preferencia de pago",
    });
  }
};

// ============================================
// WEBHOOK (Mercado Pago → tu API)
// ============================================
exports.webhook = async (req, res) => {
  try {
    console.log("🌐 Webhook MP recibido:", {
      query: req.query,
      body: req.body,
    });

    let paymentId;

    if (req.query.type === "payment" && req.query["data.id"]) {
      paymentId = req.query["data.id"];
    } else if (req.query.topic === "payment" && req.query.id) {
      paymentId = req.query.id;
    } else if (req.body?.data?.id) {
      paymentId = req.body.data.id;
    }

    if (!paymentId) {
      console.warn("Webhook sin paymentId, respondo 200 igual");
      return res.sendStatus(200);
    }

    const result = await mercadopago.payment.findById(paymentId);
    const payment = result.body || result;

    console.log("💳 Detalle pago MP:", {
      status: payment.status,
      external_reference: payment.external_reference,
      transaction_amount: payment.transaction_amount,
    });

    if (payment.status !== "approved") {
      console.log("Pago no aprobado, estado:", payment.status);
      return res.sendStatus(200);
    }

    const externalRef = payment.external_reference || "";
    const parts = externalRef.split("|");
    console.log("🔎 external_reference parts:", parts);

    let pagoDoc = null;

    // CASO 1: external_reference = _id de Pago (24 chars)
    if (parts[0] && parts[0].length === 24 && parts.length === 1) {
      pagoDoc = await Pago.findById(parts[0]);
    }

    // CASO 2: _id de Pago + otros datos (pagoId|mes, etc.)
    if (!pagoDoc && parts[0] && parts[0].length === 24 && parts.length > 1) {
      pagoDoc = await Pago.findById(parts[0]);
    }

    // CASO 3: jugadorId|apoderadoId|categoriaId|mes
    if (!pagoDoc && parts.length === 4) {
      const [jugadorId, apoderadoId, categoriaId, mes] = parts;

      if (jugadorId && apoderadoId && categoriaId && mes) {
        pagoDoc = await Pago.findOne({ jugador: jugadorId, mes });

        if (!pagoDoc) {
          pagoDoc = new Pago({
            jugador: jugadorId,
            apoderado: apoderadoId,
            categoria: categoriaId,
            mes,
            monto: payment.transaction_amount,
            metodoPago: "App",
            plataforma: "MercadoPago",
            estado: "Pagado",
            fechaPago: payment.date_approved || new Date(),
            observacion: "Pago confirmado vía Mercado Pago",
          });
        }
      }
    }

    // CASO 4: formato viejo jugadorId|mes
    if (!pagoDoc && parts.length === 2) {
      const [jugadorId, mes] = parts;
      if (jugadorId && mes) {
        pagoDoc = await Pago.findOne({ jugador: jugadorId, mes });
      }
    }

    if (!pagoDoc) {
      console.warn(
        "⚠️ No se pudo mapear external_reference a un pago local:",
        externalRef
      );
      return res.sendStatus(200);
    }

    // Actualizar campos comunes
    pagoDoc.monto = payment.transaction_amount;
    pagoDoc.estado = "Pagado";
    pagoDoc.metodoPago = "App";
    pagoDoc.plataforma = "MercadoPago";
    pagoDoc.fechaPago = payment.date_approved || new Date();

    await pagoDoc.save();

    console.log("✅ Pago guardado/actualizado en Mongo:", pagoDoc._id);

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook MP:", error);
    return res.sendStatus(500);
  }
};
