const express = require("express");
const router = express.Router();
const categoriaController = require("../controllers/categoria.controller");

// Crear categoría
router.post("/crear", categoriaController.crearCategoria);

// Listar categorías
router.get("/", categoriaController.listarCategorias);

// ⚠️ ESTA RUTA DEBE IR ANTES QUE /:id
router.get("/entrenadores/disponibles", categoriaController.entrenadoresDisponibles);

// Obtener categoría por ID
router.get("/:id", categoriaController.obtenerCategoriaPorId);

// Editar categoría
router.put("/:id/editar", categoriaController.editarCategoria);

// Eliminar categoría
router.delete("/:id/eliminar", categoriaController.eliminarCategoria);

module.exports = router;
