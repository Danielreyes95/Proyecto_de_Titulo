const express = require("express");
const router = express.Router();
const invite = require("../controllers/invitacion-director.controller");
const session = require("../controllers/escuela-session.controller");
const { requireSchoolUser, requireDirector } = require("../middleware/escuela-auth");
const { actualizarBrandingDirector } = require("../controllers/escuela-branding.controller");
const { loginThrottle } = require("../middleware/login-throttle");
const categoria = require("../controllers/escuela-categoria.controller");

router.post("/auth/login", loginThrottle, session.login);
router.get("/invitaciones/consultar", invite.consultar);
router.post("/invitaciones/aceptar", loginThrottle, invite.aceptar);
router.post("/invitaciones/aceptar-existente", requireSchoolUser, session.aceptarExistente);
router.get("/mis-escuelas", requireSchoolUser, session.misEscuelas);
router.get("/:escuelaId/director", requireSchoolUser, requireDirector, session.miEscuela);
router.patch("/:escuelaId/branding", requireSchoolUser, requireDirector, actualizarBrandingDirector);

// Módulo NUEVO independiente del legacy /api/categorias.
router.get("/:escuelaId/categorias", requireSchoolUser, requireDirector, categoria.listar);
router.post("/:escuelaId/categorias", requireSchoolUser, requireDirector, categoria.crear);
router.patch("/:escuelaId/categorias/:categoriaId", requireSchoolUser, requireDirector, categoria.actualizar);

module.exports = router;
