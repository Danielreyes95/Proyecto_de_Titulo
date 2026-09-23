const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const PlatformAdmin = require("../models/platform-admin.model");
const {
  platformSecret, TOKEN_ISSUER, TOKEN_AUDIENCE
} = require("../middleware/platform-auth");

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
// Limpieza periódica: evita que el mapa crezca indefinidamente.
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of attempts) {
    if (data.until <= now) attempts.delete(key);
  }
}, WINDOW_MS).unref();
const MAX_ATTEMPTS = 5;

function checkRateLimit(key) {
  const now = Date.now();
  const attempt = attempts.get(key);
  if (!attempt || attempt.until <= now) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
    return true;
  }
  if (attempt.count >= MAX_ATTEMPTS) return false;
  attempt.count += 1;
  return true;
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" ||
        email.length > 254 || password.length > 1024 ||
        !email.trim() || !password) {
      return res.status(400).json({ error: "Credenciales inválidas" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Proteger de intentos repetidos por IP y cuenta. Complementar con un
    // rate-limit compartido (Redis/proxy) antes de despliegue horizontal.
    const address = req.ip || "unknown";
    if (!checkRateLimit(`ip:${address}`) ||
        !checkRateLimit(`account:${normalizedEmail}`)) {
      return res.status(429).json({ error: "Demasiados intentos. Intenta más tarde." });
    }

    const admin = await PlatformAdmin.findOne({ email: normalizedEmail })
      .select("+passwordHash email estado tokenVersion");
    // Hash de relleno para reducir diferencias de tiempo entre cuentas.
    const fallback = "$2b$10$abcdefghijklmnopqrstuuumVOmx6XXzmxJKLsQlt7AASkPxMPEYW";
    const valid = await bcrypt.compare(password, admin?.passwordHash || fallback);
    if (!admin || admin.estado !== "activo" || !valid) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    let token;
    try {
      token = jwt.sign(
        { rol: "superadmin", tv: admin.tokenVersion },
        platformSecret(),
        {
          algorithm: "HS256",
          subject: String(admin._id),
          issuer: TOKEN_ISSUER,
          audience: TOKEN_AUDIENCE,
          expiresIn: "1h"
        }
      );
    } catch (error) {
      console.error("Configuración de autenticación de plataforma incompleta");
      return res.status(503).json({ error: "Servicio de administración no configurado" });
    }

    attempts.delete(`account:${normalizedEmail}`);
    attempts.delete(`ip:${address}`);
    return res.json({
      token,
      expiresIn: 3600,
      usuario: { id: admin._id, email: admin.email, rol: "superadmin" }
    });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.json({ id: req.platformAdmin.id, rol: "superadmin" });
}

module.exports = { login, me };
