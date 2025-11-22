const Entrenador = require("../models/entrenador.model");
const Categoria = require("../models/categoria.model");

/* ===============================
   Crear entrenador
================================ */
exports.crearEntrenador = async (req, res) => {
  try {
    const nuevoEntrenador = new Entrenador(req.body);
    await nuevoEntrenador.save();
    res.json({ mensaje: "Entrenador creado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al crear entrenador", detalle: error.message });
  }
};

/* ===============================
   Listar entrenadores
================================ */
exports.listarEntrenadores = async (req, res) => {
  try {
    const entrenadores = await Entrenador.find().lean();

    for (let e of entrenadores) {
    const categoria = await Categoria.findOne({ entrenador: e._id }, "nombre edadMin edadMax");
    e.categoria = categoria || null;
}

res.json(entrenadores);

  } catch (error) {
    res.status(500).json({ error: "Error al obtener entrenadores", detalle: error.message });
  }
};

/* ===============================
   Cambiar estado
================================ */
exports.cambiarEstado = async (req, res) => {
  try {
    const entrenador = await Entrenador.findById(req.params.id);

    if (!entrenador) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    entrenador.estado = entrenador.estado === "activo" ? "inactivo" : "activo";
    await entrenador.save();

    res.json({
      mensaje: "Estado actualizado correctamente",
      estado: entrenador.estado
    });

  } catch (error) {
    res.status(500).json({ error: "Error al cambiar estado", detalle: error.message });
  }
};

/* ===============================
   Cambiar categoría
================================ */
exports.cambiarCategoria = async (req, res) => {
  try {
    const { idEntrenador, categoriaId } = req.body;

    const entrenador = await Entrenador.findById(idEntrenador);
    if (!entrenador) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    const categoria = await Categoria.findById(categoriaId);
    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    entrenador.categoria = categoriaId;
    await entrenador.save();

    res.json({ mensaje: "Categoría cambiada correctamente" });

  } catch (error) {
    res.status(500).json({ error: "Error al cambiar categoría", detalle: error.message });
  }
};

/* ===============================
   Obtener entrenador por ID
================================ */
exports.obtenerEntrenadorPorId = async (req, res) => {
  try {
    const entrenador = await Entrenador.findById(req.params.id);

    if (!entrenador) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    res.json(entrenador);

  } catch (error) {
    res.status(500).json({
      error: "Error al obtener entrenador",
      detalle: error.message
    });
  }
};