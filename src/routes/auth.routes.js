const express = require("express");
const router = express.Router();

const { 
  login, 
  registroApoderado, 
  recuperarPassword, 
  cambiarPassword
} = require("../controllers/auth.controller");

// LOGIN
router.post("/login", login);

// REGISTRO APODERADO + JUGADOR
router.post("/registro-apoderado", registroApoderado);

// RECUPERAR CONTRASEÑA
router.post("/recuperar-password", recuperarPassword);

// CAMBIAR CONTRASEÑA TEMPORAL
router.put("/cambiar-password", cambiarPassword);

module.exports = router;
