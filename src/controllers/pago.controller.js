const Pago = require("../models/pago.model");
const Jugador = require("../models/jugador.model");

/* ============================================================
   🔧 LIMPIAR MES → evita errores tipo "Noviembre 2025 2025"
============================================================ */
function limpiarMes(mes) {
  if (!mes) return mes;

  const partes = mes.trim().split(" ");

  if (partes.length === 3 && partes[1] === partes[2]) {
    return `${partes[0]} ${partes[1]}`;
  }

  return mes.trim();
}

/* ============================================================
   🟢 REGISTRAR PAGO
============================================================ */
exports.registrarPago = async (req, res) => {
  try {
    let { jugadorId, mes, monto, metodoPago, observacion } = req.body;

    mes = limpiarMes(mes);

    const jugador = await Jugador.findById(jugadorId).populate("apoderado categoria");

    if (!jugador)
      return res.status(404).json({ error: "Jugador no encontrado" });

    const pagoExistente = await Pago.findOne({ jugador: jugadorId, mes });
    if (pagoExistente)
      return res.status(400).json({
        error: "El jugador ya tiene un pago registrado en este mes."
      });

    const nuevoPago = await Pago.create({
      jugador: jugadorId,
      apoderado: jugador.apoderado?._id || null,
      categoria: jugador.categoria?._id || null,
      mes,
      monto,
      metodoPago,
      plataforma: metodoPago === "App" ? "App" : "Manual",
      estado: "Pagado",
      fechaPago: new Date(),
      observacion
    });

    res.json({ mensaje: "Pago registrado correctamente", pago: nuevoPago });

  } catch (error) {
    console.error("Error registrar pago:", error);
    res.status(500).json({ error: "Error al registrar pago", detalle: error.message });
  }
};

/* ============================================================
   🟠 ACTUALIZAR ESTADO
============================================================ */
exports.actualizarEstadoPago = async (req, res) => {
  try {
    const { estado, observacion } = req.body;

    const pago = await Pago.findById(req.params.id);
    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

    pago.estado = estado;
    pago.observacion = observacion;
    pago.fechaPago = estado === "Pagado" ? new Date() : null;

    await pago.save();

    res.json({ mensaje: "Estado actualizado", pago });

  } catch (error) {
    res.status(500).json({ error: "Error al actualizar estado", detalle: error.message });
  }
};

/* ============================================================
   🟣 EDITAR PAGO
============================================================ */
exports.editarPago = async (req, res) => {
  try {
    const pago = await Pago.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!pago)
      return res.status(404).json({ error: "Pago no encontrado" });

    res.json({ mensaje: "Pago actualizado", pago });

  } catch (error) {
    res.status(500).json({ error: "Error al editar pago", detalle: error.message });
  }
};

/* ============================================================
   🔴 ELIMINAR PAGO
============================================================ */
exports.eliminarPago = async (req, res) => {
  try {
    const pago = await Pago.findByIdAndDelete(req.params.id);

    if (!pago)
      return res.status(404).json({ error: "Pago no encontrado" });

    res.json({ mensaje: "Pago eliminado" });

  } catch (error) {
    res.status(500).json({ error: "Error al eliminar pago", detalle: error.message });
  }
};

/* ============================================================
   🟡 HISTORIAL PARA JUGADOR
============================================================ */
exports.historialJugador = async (req, res) => {
  try {
    const pagos = await Pago.find({ jugador: req.params.jugadorId })
      .sort({ fechaPago: 1 });

    // ← IMPORTANTE: devolver un ARRAY DIRECTO
    res.json(
      pagos.map(p => ({
        fechaPago: p.fechaPago,
        mes: limpiarMes(p.mes),
        monto: p.monto,
        metodoPago: p.metodoPago,
        observacion: p.observacion
      }))
    );

  } catch (error) {
    res.status(500).json({
      error: "Error al obtener historial",
      detalle: error.message
    });
  }
};

/* ============================================================
   🟢 PAGOS POR JUGADOR (vista jugador)
============================================================ */
exports.obtenerPagosPorJugador = async (req, res) => {
  try {
    const pagos = await Pago.find({ jugador: req.params.jugadorId })
      .sort({ fechaPago: -1 });

    res.json({
      pagos: pagos.map(p => ({
        _id: p._id,
        mes: limpiarMes(p.mes),
        monto: p.monto,
        metodoPago: p.metodoPago,
        estado: p.estado,
        fechaPago: p.fechaPago,
        observacion: p.observacion
      }))
    });

  } catch (error) {
    res.status(500).json({ error: "Error al obtener pagos", detalle: error.message });
  }
};

/* ============================================================
   🟣 PAGOS POR CATEGORÍA
============================================================ */
exports.obtenerPagosPorCategoria = async (req, res) => {
  try {
    const pagos = await Pago.find({ categoria: req.params.categoriaId })
      .populate("jugador", "nombre rut")
      .populate("apoderado", "nombre correo")
      .sort({ createdAt: -1 });

    res.json({ pagos });

  } catch (error) {
    res.status(500).json({ error: "Error al obtener pagos por categoría", detalle: error.message });
  }
};

/* ============================================================
   🟩 RESUMEN MENSUAL (DIRECTOR)
============================================================ */
exports.resumenPagos = async (req, res) => {
  try {
    let { mes, categoriaId } = req.query;

    mes = limpiarMes(mes);
    if (!mes) return res.status(400).json({ error: "Debes enviar un mes válido" });

    const filtroCategoria =
      categoriaId && categoriaId !== "todas"
        ? { categoria: categoriaId }
        : {};

    const jugadores = await Jugador.find(filtroCategoria).populate("categoria", "nombre");

    const pagosMes = await Pago.find({ mes });

    let pagados = 0, pendientes = 0, atrasados = 0;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    const [mesTexto, anioTexto] = mes.split(" ");
    const MESES = [
      "Enero","Febrero","Marzo","Abril","Mayo","Junio",
      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    const mesIndex = MESES.indexOf(mesTexto);

    const esMesActual = mesIndex === mesActual && Number(anioTexto) === anioActual;

    const detalle = jugadores.map(j => {
      const pago = pagosMes.find(p => String(p.jugador) === String(j._id));

      let estado = pago ? pago.estado : "Pendiente";

      if (!pago && !esMesActual) estado = "Atrasado";

      if (estado === "Pagado") pagados++;
      else if (estado === "Atrasado") atrasados++;
      else pendientes++;

      return {
        jugadorId: j._id,
        nombre: j.nombre,
        rut: j.rut,
        createdAt: j.createdAt,
        categoria: j.categoria?.nombre || "Sin categoría",
        estadoPago: estado,
        pagoId: pago?._id || null,
        monto: pago?.monto || 0,
        fechaPago: pago?.fechaPago || null,
        metodoPago: pago?.metodoPago || null,
        observacion: pago?.observacion || null
      };
    });

    res.json({
      pagados,
      pendientes,
      atrasados,
      montoTotal: detalle.reduce(
        (acc, j) => j.estadoPago === "Pagado" ? acc + j.monto : acc,
        0
      ),
      jugadores: detalle
    });

  } catch (error) {
    console.error("Error resumenPagos:", error);
    res.status(500).json({ error: "Error en resumen", detalle: error.message });
  }
};

/* ============================================================
   🟦 REPORTE DE PAGOS (FALTABA ESTA FUNCIÓN)
============================================================ */
exports.reportePagos = async (req, res) => {
  try {
    const { categoriaId } = req.query;

    const jugadores = await Jugador.find(categoriaId ? { categoria: categoriaId } : {})
      .populate("categoria", "nombre");

    const pagos = await Pago.find()
      .populate("jugador", "nombre rut")
      .populate("categoria", "nombre");

    const detalle = jugadores.map(j => {
      const pago = pagos.find(p => String(p.jugador?._id) === String(j._id));

      return {
        jugadorId: j._id,
        nombre: j.nombre,
        rut: j.rut,
        categoria: j.categoria?.nombre || "Sin categoría",
        estado: pago ? pago.estado : "Pendiente",
        monto: pago?.monto || 0,
        mes: pago?.mes || "-",
        fechaPago: pago?.fechaPago || null
      };
    });

    res.json({ detalle });

  } catch (error) {
    console.error("Error reportePagos:", error);
    res.status(500).json({ error: "Error en reporte de pagos", detalle: error.message });
  }
};

/* ============================================================
   🟦 MESES DEL JUGADOR
============================================================ */
exports.mesesJugador = async (req, res) => {
  try {
    const jugadorId = req.params.jugadorId;

    const jugador = await Jugador.findById(jugadorId);
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado" });

    const MESES = [
      "Enero","Febrero","Marzo","Abril","Mayo","Junio",
      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];

    const creado = new Date(jugador.createdAt);
    const añoActual = new Date().getFullYear();

    let meses = [];

    for (let m = creado.getMonth(); m < 12; m++) {
      meses.push({ mes: MESES[m], anio: creado.getFullYear() });
    }

    if (creado.getFullYear() < añoActual) {
      for (let m = 0; m < 12; m++) {
        meses.push({ mes: MESES[m], anio: añoActual });
      }
    }

    const pagos = await Pago.find({ jugador: jugadorId });

    res.json({
      meses: meses.map(m => {
        const key = `${m.mes} ${m.anio}`;
        const pago = pagos.find(p => limpiarMes(p.mes) === key);
        return {
          mes: m.mes,
          anio: m.anio,
          pagado: !!pago,
          fechaPago: pago?.fechaPago || null
        };
      })
    });

  } catch (error) {
    res.status(500).json({ error: "Error al obtener meses", detalle: error.message });
  }
};
