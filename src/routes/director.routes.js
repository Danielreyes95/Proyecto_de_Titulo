const express = require("express");
const router = express.Router();
const Director = require("../models/director.model");



// Crear director
router.post("/crear", async (req, res) => {
  try {
    const { nombre, rut, password } = req.body;

    if (!nombre || !rut || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    // SIN hash aquí, se guarda en texto plano
    const director = await Director.create({
      nombre,
      rut,
      password
    });

    res.json({
      mensaje: "✅ Director creado correctamente",
      director
    });
  } catch (error) {
    res.status(500).json({
      error: "Error al crear director",
      detalle: error.message
    });
  }
});

module.exports = router;
