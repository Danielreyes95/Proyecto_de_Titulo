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

    // 👀 VER QUÉ ESTÁ LLEGANDO DESDE EL FRONT
    console.log("🧾 Body crearPreferencia:", req.body);

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
      payer: emailApoderado ? { email: emailApoderado } : undefined,
      back_urls: {
        success: `${process.env.FRONTEND_URL}/jugador/pago-exitoso.html`,
        failure: `${process.env.FRONTEND_URL}/jugador/pago-fallido.html`,
        pending: `${process.env.FRONTEND_URL}/jugador/pago-pendiente.html`,
      },
      auto_return: "approved",
      notification_url: `${process.env.BACKEND_URL}/api/mercado-pago/webhook`,

      external_reference: idPago
        ? String(idPago)
        : jugadorId && mes
        ? [jugadorId, apoderadoId || "", categoriaId || "", mes].join("|")
        : "",
    };

    console.log("🧾 Preferencia a crear:", {
      external_reference: preference.external_reference,
      notification_url: preference.notification_url,
    });

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

    const topic =
      req.query.topic ||
      req.query.type ||
      req.body?.topic ||
      req.body?.type;

    console.log("📌 Topic webhook:", topic);

    let externalRef = "";
    let transactionAmount = 0;
    let dateApproved = new Date();

    // =======================================
    // CASO A: merchant_order  (USAR ESTE)
    // =======================================
    if (topic === "merchant_order") {
      let merchantOrderId = null;

      if (req.query.id) {
        merchantOrderId = req.query.id;
      } else if (req.body?.data?.id) {
        merchantOrderId = req.body.data.id;
      }

      console.log("📦 merchantOrderId:", merchantOrderId);

      if (!merchantOrderId) {
        console.warn("⚠️ Webhook merchant_order sin id, respondo 200");
        return res.sendStatus(200);
      }

      const result = await mercadopago.merchant_orders.findById(
        merchantOrderId
      );
      const order = result.body || result;

      console.log("📦 merchant_order data:", {
        order_status: order.order_status,
        external_reference: order.external_reference,
        total_amount: order.total_amount,
        payments: order.payments,
      });

      externalRef = order.external_reference || "";
      transactionAmount =
        order.total_amount ||
        (order.payments && order.payments[0]
          ? order.payments[0].transaction_amount
          : 0);

      // buscar un pago aprobado dentro de la orden
      const approvedPayment = (order.payments || []).find(
        (p) => p.status === "approved"
      );

      if (!approvedPayment && order.order_status !== "paid") {
        console.log(
          "⚠️ Orden aún no pagada. order_status:",
          order.order_status
        );
        return res.sendStatus(200);
      }

      if (approvedPayment) {
        dateApproved = approvedPayment.date_approved || new Date();
      } else {
        dateApproved = new Date();
      }

      // aquí consideramos el pago como aprobado
      console.log("💳 Orden pagada, external_reference:", externalRef);
    }

    // =======================================
    // CASO B: payment  (SOLO LOG, NO PROCESA)
    // =======================================
    else if (topic === "payment") {
      console.log(
        "ℹ️ Webhook de tipo payment recibido, se maneja sólo vía merchant_order."
      );
      return res.sendStatus(200);
    }

    // =======================================
    // CASO C: topic desconocido
    // =======================================
    else {
      console.warn("⚠️ Topic no soportado en webhook:", topic);
      return res.sendStatus(200);
    }

    // ===========================
    // MAPEAR external_reference
    // ===========================
    const parts = (externalRef || "").split("|");
    console.log("🔎 external_reference parts:", parts);

    let pagoDoc = null;

    // CASO 1: external_reference = _id de Pago
    if (parts[0] && parts[0].length === 24 && parts.length === 1) {
      pagoDoc = await Pago.findById(parts[0]);
    }

    // CASO 2: _id de Pago + otros datos
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
            monto: transactionAmount,
            metodoPago: "App",
            plataforma: "MercadoPago",
            estado: "Pagado",
            fechaPago: dateApproved,
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

    // ===========================
    // ACTUALIZAR / GUARDAR
    // ===========================
    pagoDoc.monto = transactionAmount;
    pagoDoc.estado = "Pagado";
    pagoDoc.metodoPago = "App";
    pagoDoc.plataforma = "MercadoPago";
    pagoDoc.fechaPago = dateApproved;

    await pagoDoc.save();

    console.log("✅ Pago guardado/actualizado en Mongo:", pagoDoc._id);

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook MP:", error);
    return res.sendStatus(500);
  }
};