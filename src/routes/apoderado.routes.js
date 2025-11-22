const express = require("express");
const router = express.Router();
const apoderadoController = require("../controllers/apoderado.controller");

// Consultar apoderado y sus jugadores
router.get("/:rutApoderado", apoderadoController.obtenerApoderadoConJugadores);

module.exports = router;
