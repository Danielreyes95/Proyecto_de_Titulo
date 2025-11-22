const express = require("express");
const router = express.Router();
const entrenadorController = require("../controllers/entrenador.controller");

// Crear entrenador
router.post("/crear", entrenadorController.crearEntrenador);

// Listar todos los entrenadores
router.get("/listar", entrenadorController.listarEntrenadores);

// Obtener un entrenador por ID
router.get("/:id", entrenadorController.obtenerEntrenadorPorId);

// Cambiar estado (activo/inactivo)
router.put("/cambiar-estado/:id", entrenadorController.cambiarEstado);

// Cambiar categoría del entrenador
router.put("/cambiar-categoria", entrenadorController.cambiarCategoria);

module.exports = router;
