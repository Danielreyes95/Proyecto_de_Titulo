const Categoria = require("../models/categoria.model");
const Jugador = require("../models/jugador.model");
const Entrenador = require("../models/entrenador.model");
const Evento = require("../models/evento.model");

/* =====================================================
   CREAR CATEGORÍA
===================================================== */
exports.crearCategoria = async (req, res) => {
  try {
    const { nombre, edadMin, edadMax, entrenador } = req.body;

    if (!nombre || !edadMin || !edadMax) {
      return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    if (parseInt(edadMin) >= parseInt(edadMax)) {
      return res.status(400).json({ error: "Edad mínima debe ser menor que edad máxima." });
    }

    // Verificar nombre duplicado
    const existeNombre = await Categoria.findOne({ nombre });
    if (existeNombre) {
      return res.status(400).json({ error: "Ya existe una categoría con ese nombre." });
    }

    // Verificar si el entrenador ya está asignado a otra categoría
    if (entrenador) {
      const entrenadorAsignado = await Categoria.findOne({ entrenador });
      if (entrenadorAsignado) {
        return res.status(400).json({
          error: "Este entrenador ya está asignado a otra categoría."
        });
      }
    }

    const nueva = new Categoria({
      nombre,
      edadMin,
      edadMax,
      entrenador: entrenador || null
    });

    await nueva.save();

    // Asignar categoría al entrenador
    if (entrenador) {
      await Entrenador.findByIdAndUpdate(entrenador, {
        categoria: nueva._id
      });
    }

    res.json({ mensaje: "Categoría creada correctamente", categoria: nueva });

  } catch (error) {
    res.status(500).json({ error: "Error al crear categoría", detalle: error.message });
  }
};


/* =====================================================
   LISTAR CATEGORÍAS
===================================================== */
exports.listarCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find()
      .sort({ edadMin: 1 })
      .populate("entrenador", "nombre rut correo");

    res.json(categorias);

  } catch (error) {
    res.status(500).json({
      error: "Error al listar categorías",
      detalle: error.message
    });
  }
};


/* =====================================================
   OBTENER CATEGORÍA POR ID
===================================================== */
exports.obtenerCategoriaPorId = async (req, res) => {
  try {
    const id = req.params.id;

    const categoria = await Categoria.findById(id)
      .populate("entrenador", "nombre rut correo");

    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }

    res.json(categoria);

  } catch (error) {
    res.status(500).json({
      error: "Error al obtener categoría",
      detalle: error.message
    });
  }
};


/* =====================================================
   EDITAR CATEGORÍA
===================================================== */
exports.editarCategoria = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, edadMin, edadMax, entrenador } = req.body;

    if (!nombre || !edadMin || !edadMax) {
      return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    if (parseInt(edadMin) >= parseInt(edadMax)) {
      return res.status(400).json({ error: "Edad mínima debe ser menor que edad máxima." });
    }

    const categoriaActual = await Categoria.findById(id);
    if (!categoriaActual) {
      return res.status(404).json({ error: "Categoría no encontrada." });
    }

    const entrenadorAnterior = categoriaActual.entrenador;

    if (entrenador && String(entrenador) !== String(entrenadorAnterior)) {
      const entrenadorAsignado = await Categoria.findOne({
        entrenador,
        _id: { $ne: id }
      });

      if (entrenadorAsignado) {
        return res.status(400).json({
          error: "Este entrenador ya está asignado a otra categoría."
        });
      }
    }

    categoriaActual.nombre = nombre;
    categoriaActual.edadMin = edadMin;
    categoriaActual.edadMax = edadMax;
    categoriaActual.entrenador = entrenador || null;

    await categoriaActual.save();

    if (entrenadorAnterior && (!entrenador || String(entrenadorAnterior) !== String(entrenador))) {
      await Entrenador.findByIdAndUpdate(entrenadorAnterior, { categoria: null });
    }

    if (entrenador) {
      await Entrenador.findByIdAndUpdate(entrenador, { categoria: categoriaActual._id });
    }

    res.json({ mensaje: "Categoría actualizada correctamente", categoria: categoriaActual });

  } catch (error) {
    res.status(500).json({ error: "Error al editar categoría", detalle: error.message });
  }
};


/* =====================================================
   ELIMINAR CATEGORÍA
===================================================== */
exports.eliminarCategoria = async (req, res) => {
  try {
    const id = req.params.id;

    const categoria = await Categoria.findById(id);
    if (!categoria) {
      return res.status(404).json({ error: "Categoría no encontrada." });
    }

    const jugadoresAsociados = await Jugador.find({ categoria: id });

    if (jugadoresAsociados.length > 0) {
      return res.status(400).json({
        error: "Debe reasignar los jugadores antes de eliminar la categoría."
      });
    }

    if (categoria.entrenador) {
      await Entrenador.findByIdAndUpdate(categoria.entrenador, {
        categoria: null
      });
    }

    await Categoria.findByIdAndDelete(id);

    res.json({ mensaje: "Categoría eliminada correctamente." });

  } catch (err) {
    res.status(500).json({ error: "Error en el servidor.", detalle: err.message });
  }
};


/* =====================================================
   ENTRENADORES DISPONIBLES
===================================================== */
exports.entrenadoresDisponibles = async (req, res) => {
  try {
    const ocupados = await Categoria.find().distinct("entrenador");

    const disponibles = await Entrenador.find({
      _id: { $nin: ocupados }
    }).select("nombre rut correo");

    res.json(disponibles);

  } catch (error) {
    res.status(500).json({
      error: "Error al obtener entrenadores disponibles",
      detalle: error.message
    });
  }
};


/* =====================================================
   📊 RENDIMIENTO GLOBAL DE LA CATEGORÍA
===================================================== */
exports.rendimientoCategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;

    // 1. Jugadores de la categoría
    const jugadores = await Jugador.find({ categoria: categoriaId });

    // 2. Eventos reales de la categoría (IMPORTANTE)
    const eventos = await Evento.find({ categoria: categoriaId });

    let resultado = [];

    jugadores.forEach(jugador => {

      let totalEventos = 0;
      let presentes = 0;

      let goles = 0;
      let asistenciasGol = 0;
      let pasesClave = 0;
      let recuperaciones = 0;
      let tirosArco = 0;
      let faltasCometidas = 0;
      let faltasRecibidas = 0;
      let amarillas = 0;
      let rojas = 0;

      eventos.forEach(evento => {

        // 🟢 Buscar asistencia del jugador dentro del evento
        const reg = evento.asistencia.find(
          a => String(a.jugador) === String(jugador._id)
        );

        // Si no hay registro → ese jugador no fue parte
        if (!reg) return;

        totalEventos++;
        if (reg.presente) presentes++;

        goles += reg.goles || 0;
        asistenciasGol += reg.asistenciasGol || 0;
        pasesClave += reg.pasesClave || 0;
        recuperaciones += reg.recuperaciones || 0;
        tirosArco += reg.tirosArco || 0;
        faltasCometidas += reg.faltasCometidas || 0;
        faltasRecibidas += reg.faltasRecibidas || 0;
        if (reg.amarilla) amarillas++;
        if (reg.roja) rojas++;
      });

      // 🟡 Asistencia promedio
      const porcentajeAsistencia =
        totalEventos > 0 ? Number(((presentes / totalEventos) * 100).toFixed(1)) : 0;

      resultado.push({
        jugador: jugador.nombre,
        jugadorId: jugador._id,
        asistencia: porcentajeAsistencia,
        goles,
        asistenciasGol,
        pasesClave,
        recuperaciones,
        tirosArco,
        faltasCometidas,
        faltasRecibidas,
        amarillas,
        rojas
      });
    });

    res.json(resultado);

  } catch (error) {
    console.error("Error rendimientoCategoria:", error);
    res.status(500).json({
      error: "Error al obtener rendimiento de la categoría"
    });
  }
};
