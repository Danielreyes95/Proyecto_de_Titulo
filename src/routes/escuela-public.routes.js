const express = require("express");
const router = express.Router();
const { marcaPublica } = require("../controllers/platform-escuela.controller");

// Únicamente nombre, slug y branding de escuelas ACTIVAS; sin datos privados.
router.get("/:slug/marca", marcaPublica);

module.exports = router;
