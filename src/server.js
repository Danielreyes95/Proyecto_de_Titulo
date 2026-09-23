const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
require("./config/database");

// =============================
// IMPORTAR RUTAS
// =============================
const authRoutes = require("./routes/auth.routes");
const categoriaRoutes = require("./routes/categoria.routes");
const jugadorRoutes = require("./routes/jugador.routes");
const apoderadoRoutes = require("./routes/apoderado.routes");
const entrenadorRoutes = require("./routes/entrenador.routes");
const asistenciaRoutes = require("./routes/asistencia.routes");
const directorRoutes = require("./routes/director.routes");
const pagoRoutes = require("./routes/pago.routes");
const avisoRoutes = require("./routes/aviso.routes");
const mercadoPagoRoutes = require("./routes/mercado-pago.routes");
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
  app.use("/api/auth", authRoutes);
  app.use("/api/categorias", categoriaRoutes);
  app.use("/api/jugadores", jugadorRoutes);
  app.use("/api/apoderados", apoderadoRoutes);
  app.use("/api/entrenadores", entrenadorRoutes);
  app.use("/api/asistencia", asistenciaRoutes);
  app.use("/api/directores", directorRoutes);
  app.use("/api/pagos", pagoRoutes);
  app.use("/api/avisos", avisoRoutes);
  app.use("/api/evento", require("./routes/evento.routes"));
  app.use("/api/mercado-pago", mercadoPagoRoutes);
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
