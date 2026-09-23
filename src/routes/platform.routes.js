const express = require("express");
const router = express.Router();
const { login, me } = require("../controllers/platform-auth.controller");
const escuela = require("../controllers/platform-escuela.controller");
const { requirePlatformAdmin } = require("../middleware/platform-auth");
const { invitar } = require("../controllers/invitacion-director.controller");

router.post("/auth/login", login);
router.get("/auth/me", requirePlatformAdmin, me);

router.use("/escuelas", requirePlatformAdmin);
router.get("/escuelas", escuela.listar);
router.post("/escuelas", escuela.crear);
router.patch("/escuelas/:id", escuela.actualizar);
router.patch("/escuelas/:id/branding", escuela.actualizarBranding);
router.post("/escuelas/:escuelaId/invitar-director", invitar);

module.exports = router;
