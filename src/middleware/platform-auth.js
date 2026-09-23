const jwt = require("jsonwebtoken");
const PlatformAdmin = require("../models/platform-admin.model");

const TOKEN_ISSUER = "escuela-plataforma";
const TOKEN_AUDIENCE = "plataforma-admin";

function platformSecret() {
  const secret = process.env.PLATFORM_JWT_SECRET;
  if (!secret || secret.length < 32 || secret === process.env.JWT_SECRET) {
    throw new Error("Configurar PLATFORM_JWT_SECRET único (mínimo 32 caracteres)");
  }
  return secret;
}

async function requirePlatformAdmin(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) return res.status(401).json({ error: "Acceso no autorizado" });

  let token;
  try {
    token = jwt.verify(match[1], platformSecret(), {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE
    });
    if (token.rol !== "superadmin" || !token.sub) {
      return res.status(401).json({ error: "Acceso no autorizado" });
    }
  } catch (error) {
    if (/PLATFORM_JWT_SECRET/.test(error.message)) {
      console.error("Configuración de autenticación de plataforma incompleta");
      return res.status(503).json({ error: "Servicio de administración no configurado" });
    }
    return res.status(401).json({ error: "Acceso no autorizado" });
  }

  try {
    const admin = await PlatformAdmin.findById(token.sub).select("estado tokenVersion");
    if (!admin || admin.estado !== "activo" || admin.tokenVersion !== token.tv) {
      return res.status(401).json({ error: "Acceso no autorizado" });
    }
    req.platformAdmin = { id: String(admin._id) };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requirePlatformAdmin,
  platformSecret,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE
};
