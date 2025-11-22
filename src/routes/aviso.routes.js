const express = require("express");
const router = express.Router();
const avisoController = require("../controllers/aviso.controller");

// Listar avisos
router.get("/", avisoController.listarAvisos);

// Crear aviso
router.post("/", avisoController.crearAviso);

// Editar aviso
router.put("/:id", avisoController.editarAviso);

// Eliminar aviso
router.delete("/:id", avisoController.eliminarAviso);

module.exports = router;
