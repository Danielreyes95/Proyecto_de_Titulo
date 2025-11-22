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

    // Helper para procesar UNA merchant_order y guardar/actualizar Pago
    async function procesarOrden(order) {
      if (!order) {
        console.warn("⚠️ procesarOrden llamado sin order");
        return;
      }

      console.log("📦 merchant_order data:", {
        order_status: order.order_status,
        external_reference: order.external_reference,
        total_amount: order.total_amount,
        payments: order.payments,
      });

      const externalRef = order.external_reference || "";
      let transactionAmount =
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
        return;
      }

      const dateApproved =
        approvedPayment?.date_approved ? approvedPayment.date_approved : new Date();

      console.log("💳 Orden pagada, external_reference:", externalRef);

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
          // intento buscar uno existente
          pagoDoc = await Pago.findOne({ jugador: jugadorId, mes });

          if (!pagoDoc) {
            console.log("🟢 Creando nuevo Pago desde MP");
            pagoDoc = new Pago({
              jugador: jugadorId,
              apoderado: apoderadoId,
              categoria: categoriaId,
              mes,
              monto: transactionAmount,
              metodoPago: "App",           // 👈 coincide con tu enum
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
        return;
      }

      // Actualizar campos comunes
      pagoDoc.monto = transactionAmount;
      pagoDoc.estado = "Pagado";
      pagoDoc.metodoPago = "App";
      pagoDoc.plataforma = "MercadoPago";
      pagoDoc.fechaPago = dateApproved;

      await pagoDoc.save();

      console.log("✅ Pago guardado/actualizado en Mongo:", pagoDoc._id);
    }

    // =======================================
    // CASO A: merchant_order
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

      await procesarOrden(order);

      return res.sendStatus(200);
    }

    // =======================================
    // CASO B: payment
    // -> buscar merchant_order usando el payment_id
    // =======================================
    if (topic === "payment") {
      let paymentId = null;

      if (req.query["data.id"]) {
        paymentId = req.query["data.id"];
      } else if (req.query.id) {
        paymentId = req.query.id;
      } else if (req.body?.data?.id) {
        paymentId = req.body.data.id;
      }

      console.log("💳 paymentId (payment):", paymentId);

      if (!paymentId) {
        console.warn("⚠️ Webhook payment sin paymentId, respondo 200");
        return res.sendStatus(200);
      }

      try {
        const result = await mercadopago.merchant_orders.search({
          qs: { payment_id: paymentId },
        });

        const orders =
          (result.body && (result.body.elements || result.body.results)) || [];

        console.log("📦 merchant_orders.search result length:", orders.length);

        if (!orders.length) {
          console.warn(
            "⚠️ No se encontró merchant_order asociada al paymentId:",
            paymentId
          );
          return res.sendStatus(200);
        }

        const order = orders[0];

        await procesarOrden(order);
      } catch (err) {
        console.error("❌ Error en merchant_orders.search:", err);
      }

      return res.sendStatus(200);
    }

    // =======================================
    // CASO C: topic desconocido
    // =======================================
    console.warn("⚠️ Topic no soportado en webhook:", topic);
    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error en webhook MP:", error);
    return res.sendStatus(500);
  }
};