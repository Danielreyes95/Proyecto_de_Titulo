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
const eventoRapido = require("../controllers/registro-rapido.controller");
const invitarCoach = require("../controllers/invitacion-entrenador.controller");
const estadisticas = require("../controllers/estadisticas-escuela.controller");
const resumenEscuela = require("../controllers/resumen-escuela.controller");
const { requirePersonalDeportivo } = require("../middleware/escuela-deporte-auth");

router.post("/auth/login", loginThrottle, session.login);
router.get("/invitaciones/consultar", invite.consultar);
router.post("/invitaciones/aceptar", loginThrottle, invite.aceptar);
router.post("/invitaciones/aceptar-existente", requireSchoolUser, session.aceptarExistente);
router.get("/mis-escuelas", requireSchoolUser, session.misEscuelas);
router.get("/invitaciones-entrenador/consultar", invitarCoach.consultar);
router.post("/invitaciones-entrenador/aceptar",
  loginThrottle, invitarCoach.aceptarNueva);
router.post("/invitaciones-entrenador/aceptar-existente",
  requireSchoolUser, invitarCoach.aceptarExistente);
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
router.post("/:escuelaId/entrenadores/:entrenadorId/invitar",
  requireSchoolUser, requireDirector, invitarCoach.invitar);
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

// Identidad visual y rol de personal autorizado, sin datos privados de jugadores.
router.get("/:escuelaId/personal", requireSchoolUser, requirePersonalDeportivo,
  (req, res) => {
    const { escuela, rol } = req.deporteScope;
    res.json({ escuela: {
      id: escuela._id, nombre: escuela.nombre,
      branding: escuela.branding, slug: escuela.slug
    }, rol });
  });

// Visión transversal de la institución: EXCLUSIVA del director, sin fichas individuales.
router.get("/:escuelaId/estadisticas/resumen", requireSchoolUser,
  requireDirector, resumenEscuela.resumenInstitucional);

// Informes: solo categorías propias en escuela activa y eventos cerrados.
router.get("/:escuelaId/estadisticas/categorias/:categoriaId",
  requireSchoolUser, requirePersonalDeportivo, estadisticas.resumenCategoria);
router.get("/:escuelaId/estadisticas/categorias/:categoriaId/jugadores/:jugadorId",
  requireSchoolUser, requirePersonalDeportivo, estadisticas.detalleJugador);

// Registro rápido en cancha: director o entrenador con categoría asignada.
router.get("/:escuelaId/mis-categorias", requireSchoolUser,
  requirePersonalDeportivo, eventoRapido.misCategorias);
router.get("/:escuelaId/eventos", requireSchoolUser, requirePersonalDeportivo, eventoRapido.listar);
router.post("/:escuelaId/eventos", requireSchoolUser, requirePersonalDeportivo,
  eventoRapido.crear);
router.get("/:escuelaId/eventos/:eventoId", requireSchoolUser,
  requirePersonalDeportivo, eventoRapido.detalle);
router.patch("/:escuelaId/eventos/:eventoId/registros", requireSchoolUser,
  requirePersonalDeportivo, eventoRapido.guardarLote);
router.post("/:escuelaId/eventos/:eventoId/cerrar", requireSchoolUser,
  requirePersonalDeportivo, eventoRapido.cerrar);

module.exports = router;
