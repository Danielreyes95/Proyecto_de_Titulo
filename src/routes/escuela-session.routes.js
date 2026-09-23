const express = require("express");
const router = express.Router();
const invite = require("../controllers/invitacion-director.controller");
const session = require("../controllers/escuela-session.controller");
const { requireSchoolUser, requireDirector } = require("../middleware/escuela-auth");
const { actualizarBrandingDirector } = require("../controllers/escuela-branding.controller");
const { loginThrottle } = require("../middleware/login-throttle");
const categoria = require("../controllers/escuela-categoria.controller");
const entrenador = require("../controllers/escuela-entrenador.controller");
const jugador = require("../controllers/escuela-jugador.controller");

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

// Entrenadores por escuela. Todas las rutas requieren membresía de director.
router.get("/:escuelaId/entrenadores", requireSchoolUser, requireDirector, entrenador.listar);
router.post("/:escuelaId/entrenadores", requireSchoolUser, requireDirector, entrenador.crear);
router.patch("/:escuelaId/entrenadores/:entrenadorId", requireSchoolUser, requireDirector, entrenador.actualizar);
router.post("/:escuelaId/entrenadores/:entrenadorId/asignaciones", requireSchoolUser, requireDirector, entrenador.asignar);
router.patch("/:escuelaId/entrenadores/:entrenadorId/asignaciones/:categoriaId/finalizar",
  requireSchoolUser, requireDirector, entrenador.finalizarAsignacion);

// Datos de menores: acceso exclusivo del director de la escuela autorizada.
router.get("/:escuelaId/apoderados", requireSchoolUser, requireDirector, jugador.apoderados);
router.post("/:escuelaId/apoderados", requireSchoolUser, requireDirector, jugador.crearApoderado);
router.get("/:escuelaId/jugadores", requireSchoolUser, requireDirector, jugador.listar);
router.post("/:escuelaId/jugadores", requireSchoolUser, requireDirector, jugador.crear);
router.patch("/:escuelaId/jugadores/:jugadorId", requireSchoolUser, requireDirector, jugador.actualizar);
router.post("/:escuelaId/jugadores/:jugadorId/apoderados",
  requireSchoolUser, requireDirector, jugador.vincularApoderado);

module.exports = router;
