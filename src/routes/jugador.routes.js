const express = require("express");
const router = express.Router();

const jugadorController = require("../controllers/jugador.controller");

// Registrar apoderado + jugador
router.post("/registrar", jugadorController.registrarApoderadoYJugador);

// Asignar categoría manualmente
router.post("/asignar-categoria", jugadorController.asignarCategoria);

// Listar jugadores (para director y entrenador)
router.get("/listar", jugadorController.obtenerJugadores);

router.get("/categoria/:id", jugadorController.obtenerPorCategoria);

router.get("/:id", jugadorController.obtenerJugadorPorId);

router.put("/cambiar-estado/:id", jugadorController.cambiarEstado);

module.exports = router;
