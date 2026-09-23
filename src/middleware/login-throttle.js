// Protege entornos locales de desarrollo. Sustituir por Redis / proxy
// compartido antes de producción con más de una instancia.
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const LIMIT = 5;
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) if (record.until <= now) attempts.delete(key);
}, WINDOW).unref();

function loginThrottle(req, res, next) {
  const ip = req.ip || "unknown";
  const record = attempts.get(ip);
  const now = Date.now();
  if (!record || record.until <= now) {
    attempts.set(ip, { count: 1, until: now + WINDOW });
  } else if (record.count >= LIMIT) {
    return res.status(429).json({ error: "Demasiados intentos. Intenta más tarde." });
  } else {
    record.count += 1;
  }
  next();
}
module.exports = { loginThrottle };
