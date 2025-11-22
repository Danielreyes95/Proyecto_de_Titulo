const express = require("express");
const router = express.Router();
const asistenciaController = require("../controllers/asistencia.controller");

// 🔥 RUTA DETALLE EVENTO — DEBE IR PRIMERO
router.get("/evento/:idEvento", asistenciaController.detalleEvento);

// RUTAS ESPECÍFICAS
router.get("/categoria/eventos/:categoriaId", asistenciaController.eventosPorCategoria);
router.get("/categoria/:idCategoria/stats", asistenciaController.asistenciaPorCategoria);
router.get("/jugador/detalle/:jugadorId", asistenciaController.detalleJugador);
router.get("/jugador/:jugadorId/stats", asistenciaController.estadisticasJugador);

// RUTAS GENERALES
router.get("/jugador/:jugadorId", asistenciaController.obtenerAsistenciasPorJugador);
router.get("/categoria/:categoriaId", asistenciaController.obtenerAsistenciasPorCategoria);

// Registrar asistencia
router.post("/registrar", asistenciaController.registrarAsistencia);

// Eliminar evento
router.delete("/evento/:idEvento", asistenciaController.eliminarEvento);

module.exports = router;
