const EscuelaCategoria = require("../models/escuela-categoria.model");
const EscuelaEvento = require("../models/escuela-evento.model");
const {
  periodoAnual, pipelineResumenEscuela, resumenEscuela
} = require("../utils/resumen-escuela");

async function resumenInstitucional(req, res, next) {
  try {
    const anio = periodoAnual(req.query.anio);
    // req.contextoEscuela solo existe tras requireSchoolUser + requireDirector.
    const escuela = req.contextoEscuela.escuela._id;
    const [categorias, resultados] = await Promise.all([
      EscuelaCategoria.find({ escuela })
        .select("nombre modalidad estado")
        .sort({ nombre: 1 }).lean(),
      EscuelaEvento.aggregate(pipelineResumenEscuela(escuela, anio))
    ]);
    return res.json({
      escuela: {
        id: String(escuela),
        nombre: req.contextoEscuela.escuela.nombre
      },
      ...resumenEscuela(categorias, resultados, anio.anio)
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
}

module.exports = { resumenInstitucional };
