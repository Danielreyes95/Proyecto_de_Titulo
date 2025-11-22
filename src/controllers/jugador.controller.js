const Jugador = require("../models/jugador.model");
const Apoderado = require("../models/apoderado.model");
const Categoria = require("../models/categoria.model");
const bcrypt = require("bcrypt");

/* ============================================================
   🔵 GENERAR CONTRASEÑA TEMPORAL (solo para APODERADO)
   ============================================================ */
function generarPasswordTemporal() {
  return Math.random().toString(36).slice(-8); // ejemplo: m3k9s2fd
}

/* ============================================================
   🔵 Calcular edad al 1 de enero del año actual
   ============================================================ */
function edadAlInicioDeAno(fechaNacimiento) {
  const hoy = new Date();
  const inicioAno = new Date(hoy.getFullYear(), 0, 1);
  const nacimiento = new Date(fechaNacimiento);

  let edad = inicioAno.getFullYear() - nacimiento.getFullYear();

  if (
    nacimiento.getMonth() > inicioAno.getMonth() ||
    (nacimiento.getMonth() === inicioAno.getMonth() &&
      nacimiento.getDate() > inicioAno.getDate())
  ) {
    edad -= 1;
  }

  return edad;
}

/* ============================================================
   🔵 Buscar categoría según edad inicial del año
   ============================================================ */
async function obtenerCategoriaPorEdad(edad) {
  return await Categoria.findOne({
    edadMin: { $lte: edad },
    edadMax: { $gte: edad }
  });
}

/* ============================================================
   🟢 REGISTRO APODERADO + JUGADOR (FLUJO DEL DIRECTOR)
   ============================================================ */
exports.registrarApoderadoYJugador = async (req, res) => {
  try {
    const {
      rutApoderado, nombreApoderado, telefono, correo,
      rutJugador, nombreJugador, fechaNacimiento
    } = req.body;

    /* ============================
       1) Validar si el apoderado ya existe
       ============================ */
    let apoderado = await Apoderado.findOne({ rut: rutApoderado });

    /* ============================
       2) Si NO existe, se crea con CONTRASEÑA TEMPORAL
       ============================ */
    let passwordTemporalApoderado = null;

    if (!apoderado) {
      passwordTemporalApoderado = generarPasswordTemporal();

      apoderado = await Apoderado.create({
        rut: rutApoderado,
        nombre: nombreApoderado,
        telefono,
        correo,
        password: await bcrypt.hash(passwordTemporalApoderado, 10),
        debeCambiarPassword: true
      });
    }

    /* ============================
       3) Calcular edad al 1 de enero
       ============================ */
    const edad = edadAlInicioDeAno(fechaNacimiento);

    /* ============================
       4) Buscar categoría
       ============================ */
    const categoria = await obtenerCategoriaPorEdad(edad);

    /* ============================
       5) Crear jugador (sin contraseña)
       ============================ */
    const jugador = await Jugador.create({
      rut: rutJugador,
      nombre: nombreJugador,
      fechaNacimiento,
      categoria: categoria?._id || null,
      apoderado: apoderado._id,
      estado: "activo"
    });

    /* ============================
       6) RESPUESTA DEVOLVIENDO LA CONTRASEÑA TEMPORAL
       ============================ */
    return res.json({
      mensaje: "🟢 Apoderado y jugador registrados con éxito",
      categoriaAsignada: categoria?.nombre || "Sin categoría",
      passwordTemporalApoderado: passwordTemporalApoderado || "El apoderado ya existía",
      apoderado,
      jugador
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error al registrar apoderado y jugador",
      detalle: error.message
    });
  }
};

/* ============================================================
   🟡 ASIGNACIÓN MANUAL DE CATEGORÍA
   ============================================================ */
exports.asignarCategoria = async (req, res) => {
  try {
    const { jugadorId, categoriaId } = req.body;

    const jugador = await Jugador.findById(jugadorId);
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado" });

    jugador.categoria = categoriaId;
    await jugador.save();

    return res.json({
      mensaje: "Categoría asignada correctamente",
      jugador
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error al asignar categoría",
      detalle: error.message
    });
  }
};

/* ============================================================
   🔵 LISTAR TODOS LOS JUGADORES
   ============================================================ */
exports.obtenerJugadores = async (req, res) => {
  try {
    const jugadores = await Jugador.find()
      .populate("categoria", "nombre edadMin edadMax")
      .populate("apoderado", "nombre rut correo telefono");

    return res.json(jugadores);

  } catch (error) {
    return res.status(500).json({
      error: "Error al obtener jugadores",
      detalle: error.message
    });
  }
};

/* ============================================================
   🟠 CAMBIAR ESTADO
   ============================================================ */
exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;

    const jugador = await Jugador.findById(id);
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado" });

    jugador.estado = jugador.estado === "activo" ? "inactivo" : "activo";
    await jugador.save();

    return res.json({
      mensaje: "Estado actualizado",
      estado: jugador.estado
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error al cambiar estado",
      detalle: error.message
    });
  }
};

/* ============================================================
   🟢 OBTENER UN JUGADOR POR ID
   ============================================================ */
exports.obtenerJugadorPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const jugador = await Jugador.findById(id)
      .populate("categoria", "nombre edadMin edadMax")
      .populate("apoderado", "nombre rut correo telefono");

    if (!jugador) {
      return res.status(404).json({ error: "Jugador no encontrado" });
    }

    return res.json(jugador);

  } catch (error) {
    return res.status(500).json({
      error: "Error al obtener jugador",
      detalle: error.message
    });
  }
};

/* ============================================================
   🔵 Obtener jugadores por categoría
============================================================ */
exports.obtenerPorCategoria = async (req, res) => {
  try {
    const { id } = req.params;

    const jugadores = await Jugador.find({ categoria: id })
      .populate("apoderado")
      .populate("categoria");

    return res.json(jugadores);

  } catch (error) {
    console.error("Error al obtener jugadores por categoría:", error);
    return res.status(500).json({ 
      error: "Error al obtener jugadores por categoría" 
    });
  }
};
