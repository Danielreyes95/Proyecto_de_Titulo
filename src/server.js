const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
require("./config/database");

// =============================
// IMPORTAR RUTAS
// =============================
// Las rutas anteriores tienen integraciones todavía no migradas (por ejemplo,
// pagos y correo). No importarlas al iniciar la plataforma nueva: solo
// cargarlas expresamente en desarrollo legado si se habilita su uso.
const platformRoutes = require("./routes/platform.routes");
const escuelaPublicRoutes = require("./routes/escuela-public.routes");
const escuelaSessionRoutes = require("./routes/escuela-session.routes");

// =============================
// CONFIGURACIÓN EXPRESS + HTTP + SOCKET.IO
// =============================
const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",").map(origin => origin.trim()).filter(Boolean);
const io = new Server(server, {
  cors: { origin: allowedOrigins }
});
// El backend legado no tiene aislamiento por escuela y no debe estar activo
// en la plataforma multiescuela. Solo habilitarlo en desarrollo local.
const legacyEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.LEGACY_API_ENABLED === "true";

global.io = io;

// =============================
// MIDDLEWARES
// =============================
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: false
}));
app.use(express.json());

// =============================
// RUTAS API
// =============================
// Respuestas con sesiones y datos deportivos: evitar caché de intermediarios.
app.use(["/api/platform", "/api/escuela-sesion"], (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// API multiescuela: acceso separado del sistema legado
app.use("/api/platform", platformRoutes);
app.use("/api/escuelas", escuelaPublicRoutes);
app.use("/api/escuela-sesion", escuelaSessionRoutes);
if (legacyEnabled) {
  app.use("/api/auth", require("./routes/auth.routes"));
  app.use("/api/categorias", require("./routes/categoria.routes"));
  app.use("/api/jugadores", require("./routes/jugador.routes"));
  app.use("/api/apoderados", require("./routes/apoderado.routes"));
  app.use("/api/entrenadores", require("./routes/entrenador.routes"));
  app.use("/api/asistencia", require("./routes/asistencia.routes"));
  app.use("/api/directores", require("./routes/director.routes"));
  app.use("/api/pagos", require("./routes/pago.routes"));
  app.use("/api/avisos", require("./routes/aviso.routes"));
  app.use("/api/evento", require("./routes/evento.routes"));
  // El SDK de Mercado Pago del sistema anterior requiere actualización
  // antes de activar esta integración. No cargarla en modo multiescuela.
  app.use("/api/mercado-pago", require("./routes/mercado-pago.routes"));
} else {
  // Evita que una ruta legacy ausente se confunda con una página de acceso.
  app.use("/api", (req, res) => res.status(404).json({
    error: "Ruta no disponible"
  }));
}

// La entrada predeterminada apunta al sistema nuevo cuando legacy está apagado.
app.get("/", (req, res, next) => {
  if (!legacyEnabled) return res.redirect(302, "/director-acceso.html");
  return next();
});

// Servir frontend
app.use(express.static("public"));

// Ruta básica de prueba
app.get("/", (req, res) => {
  res.send("✅ API de Escuela de Fútbol funcionando");
});

// =============================
// SOCKET.IO
// =============================
io.use((socket, next) => {
  if (!legacyEnabled) return next(new Error("Canal legado deshabilitado"));
  try {
    const jwt = require("jsonwebtoken");
    const token = socket.handshake.auth?.token;
    if (!token || !process.env.JWT_SECRET) return next(new Error("No autorizado"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded.id || !["director", "entrenador", "apoderado"].includes(decoded.rol)) {
      return next(new Error("No autorizado"));
    }
    socket.data.user = decoded;
    next();
  } catch (_) { next(new Error("No autorizado")); }
});
io.on("connection", socket => {
  const { id, rol } = socket.data.user;
  socket.join(rol);
  socket.join(`user:${id}`);
});

// =============================
// INICIAR SERVIDOR
// =============================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en el puerto ${PORT}`);
});
