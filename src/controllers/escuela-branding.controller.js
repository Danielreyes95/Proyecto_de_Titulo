const Escuela = require("../models/escuela.model");
const { validateBranding } = require("../utils/escuela-validation");

async function actualizarBrandingDirector(req, res, next) {
  try {
    const branding = validateBranding(req.body, String(req.contextoEscuela.escuela._id));
    if (!Object.keys(branding).length) {
      return res.status(400).json({ error: "No hay cambios" });
    }

    // Solo campos explícitamente permitidos para esta escuela. La autorización
    // se verifica contra la membresía activa y la escuela en el middleware.
    const set = Object.fromEntries(
      Object.entries(branding).map(([key, value]) => [`branding.${key}`, value])
    );
    const escuela = await Escuela.findOneAndUpdate(
      { _id: req.contextoEscuela.escuela._id, estado: "activa" },
      { $set: set }, { new: true, runValidators: true }
    ).select("nombre slug branding");
    if (!escuela) return res.status(404).json({ error: "Escuela no encontrada" });
    return res.json({ escuela });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    return next(error);
  }
}

module.exports = { actualizarBrandingDirector };
