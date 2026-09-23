const express = require("express");
const router = express.Router();
const invite = require("../controllers/invitacion-director.controller");
const session = require("../controllers/escuela-session.controller");
const { requireSchoolUser, requireDirector } = require("../middleware/escuela-auth");
const { actualizarBrandingDirector } = require("../controllers/escuela-branding.controller");

router.post("/auth/login", session.login);
router.get("/invitaciones/consultar", invite.consultar);
router.post("/invitaciones/aceptar", invite.aceptar);
router.post("/invitaciones/aceptar-existente", requireSchoolUser, session.aceptarExistente);
router.get("/mis-escuelas", requireSchoolUser, session.misEscuelas);
router.get("/:escuelaId/director", requireSchoolUser, requireDirector, session.miEscuela);
router.patch("/:escuelaId/branding", requireSchoolUser, requireDirector, actualizarBrandingDirector);

module.exports = router;
