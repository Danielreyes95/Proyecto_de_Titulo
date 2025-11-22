const express = require("express");
const router = express.Router();

const mpController = require("../controllers/mp.controller");

// Crear preferencia
router.post("/crear-preferencia", mpController.crearPreferencia);

// Webhook (MP puede llamar por GET o POST)
router.post("/webhook", mpController.webhook);
router.get("/webhook", mpController.webhook);

module.exports = router;
