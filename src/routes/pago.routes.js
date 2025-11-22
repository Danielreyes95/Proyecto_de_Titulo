const express = require("express");
const router = express.Router();
const pagoController = require("../controllers/pago.controller");

// 🟢 Registrar pago
router.post("/registrar", pagoController.registrarPago);

// 🟠 Actualizar estado del pago (pagado / pendiente / atrasado)
router.put("/estado/:id", pagoController.actualizarEstadoPago);

// 🟣 Editar pago
router.put("/editar/:id", pagoController.editarPago);

// 🟣 Eliminar pago
router.delete("/eliminar/:id", pagoController.eliminarPago);

// 🟡 Historial del jugador (ordenado)
router.get("/historial/:jugadorId", pagoController.historialJugador);

// 🟢 Pagos por jugador (optimizado para panel jugador)
router.get("/jugador/:jugadorId", pagoController.obtenerPagosPorJugador);

// 🟣 Pagos por categoría (vista director)
router.get("/categoria/:categoriaId", pagoController.obtenerPagosPorCategoria);

// 🟩 Resumen mensual (director → pagos.html)
router.get("/resumen", pagoController.resumenPagos);

// 🟦 Reporte de pagos por mes/año/categoría
router.get("/reportes", pagoController.reportePagos);

// 🟢 Obtener meses pendientes/pagados del jugador
router.get("/meses/:jugadorId", pagoController.mesesJugador);


module.exports = router;
