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
const mpRoutes = require("./routes/mercado-pago.routes");

// =============================
// CONFIGURACIÓN EXPRESS + HTTP + SOCKET.IO
// =============================
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

global.io = io;

// =============================
// MIDDLEWARES
// =============================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// =============================
// RUTAS API
// =============================
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
app.use("/api/mercado-pago", mpRoutes);

// Servir frontend
app.use(express.static("public"));

// Ruta básica de prueba
app.get("/", (req, res) => {
  res.send("✅ API de Escuela de Fútbol funcionando");
});

// =============================
// SOCKET.IO
// =============================
io.on("connection", (socket) => {

    const { userId, rol } = socket.handshake.auth;
    if (!userId || !rol) return;

    console.log(`🔵 Usuario conectado: ${userId} (${rol})`);
    socket.join(rol);
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
        console.log(`🔴 Usuario desconectado: ${userId}`);
    });
});

// =============================
// INICIAR SERVIDOR
// =============================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en el puerto ${PORT}`);
});
