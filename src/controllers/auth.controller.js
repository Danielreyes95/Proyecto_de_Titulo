const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Director = require("../models/director.model");
const Entrenador = require("../models/entrenador.model");
const Jugador = require("../models/jugador.model");
const Apoderado = require("../models/apoderado.model");
const Categoria = require("../models/categoria.model");


/* ============================================================
   🔵 LOGIN (Director / Entrenador / Apoderado)
============================================================ */
exports.login = async (req, res) => {
  const { rut, password } = req.body;

  try {
    let user = null;
    let rol = null;

    /* 1️⃣ DIRECTOR */
    user = await Director.findOne({ rut });
    if (user) rol = "director";

    /* 2️⃣ ENTRENADOR */
    if (!user) {
      user = await Entrenador.findOne({ rut });
      if (user) rol = "entrenador";
    }

    /* 3️⃣ APODERADO ingresando con el RUT del JUGADOR */
    if (!user) {
      const jugador = await Jugador.findOne({ rut }).populate("apoderado categoria");

      if (jugador) {

        const apoderado = jugador.apoderado;
        if (!apoderado)
          return res.status(400).json({ error: "Jugador no tiene apoderado asignado" });

        // Validar contraseña del apoderado
        const passwordMatch = await bcrypt.compare(password, apoderado.password);
        if (!passwordMatch)
          return res.status(401).json({ error: "Contraseña incorrecta" });

        const token = jwt.sign(
          {
            id: apoderado._id,
            rut: apoderado.rut,
            rol: "apoderado",
            hijo: jugador.nombre
          },
          process.env.JWT_SECRET,
          { expiresIn: "4h" }
        );

        return res.json({
          mensaje: "Login exitoso",
          rol: "apoderado",               // 👈 SE MANTIENE TU LÓGICA
          panel: "jugador",               // 👈 NUEVO: indica panel a mostrar
          token,
          usuario: {
            id: apoderado._id,
            nombre: apoderado.nombre,
            rut: apoderado.rut,
            correo: apoderado.correo
          },
          jugador: {                      // 👈 NUEVO: datos del jugador
            _id: jugador._id,
            nombre: jugador.nombre,
            rut: jugador.rut,
            categoria: jugador.categoria?._id || null,
            categoriaNombre: jugador.categoria?.nombre || "Sin categoría"
          }
        });
      }
    }


    /* 4️⃣ Usuario no encontrado */
    if (!user)
      return res.status(404).json({ error: "Usuario no encontrado" });

    /* 5️⃣ Validar contraseña */
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: "Contraseña incorrecta" });

    /* 6️⃣ Crear Token */
    const token = jwt.sign(
      { id: user._id, rut: user.rut, rol },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );

    /* ============================================================
       🟢 RESPUESTA BASE
    ============================================================= */
    let usuarioResponse = {
      id: user._id,
      nombre: user.nombre,
      rut: user.rut,
      correo: user.correo || null,
      rol
    };


    /* ============================================================
       🔥 ENTRENADOR → Agregar categoría al login
    ============================================================= */
    if (rol === "entrenador") {

      const categoriaAsignada = await Categoria.findOne({ entrenador: user._id });

      usuarioResponse = {
        id: user._id,
        nombre: user.nombre,
        rut: user.rut,
        correo: user.correo,                 // ✔ Muestra correo correctamente
        rol: "entrenador",
        categoria: categoriaAsignada ? categoriaAsignada._id : null,
        categoriaNombre: categoriaAsignada ? categoriaAsignada.nombre : null
      };
    }

    /* ============================================================
       🔥 RESPUESTA FINAL
    ============================================================= */
    return res.json({
      mensaje: "Login exitoso",
      rol,
      token,
      usuario: usuarioResponse
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Error interno del servidor",
      detalle: error.message
    });
  }
};



/* ============================================================
 🟢 REGISTRO APODERADO (Apoderado + Jugador)
============================================================ */
exports.registroApoderado = async (req, res) => {
  try {
    const {
      rutApoderado,
      nombreApoderado,
      telefono,
      correo,
      passwordApoderado,
      rutJugador,
      nombreJugador,
      fechaNacimiento
    } = req.body;

    let apoderado = await Apoderado.findOne({ rut: rutApoderado });

    if (!apoderado) {
      apoderado = await Apoderado.create({
        rut: rutApoderado,
        nombre: nombreApoderado,
        telefono,
        correo,
        password: await bcrypt.hash(passwordApoderado, 10),
        debeCambiarPassword: false
      });
    }

    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    if (
      hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
    ) {
      edad--;
    }

    const categoria = await Categoria.findOne({
      edadMin: { $lte: edad },
      edadMax: { $gte: edad }
    });

    await Jugador.create({
      rut: rutJugador,
      nombre: nombreJugador,
      fechaNacimiento,
      categoria: categoria?._id || null,
      apoderado: apoderado._id,
      password: await bcrypt.hash(passwordApoderado, 10)
    });

    return res.json({
      mensaje: "Cuenta creada correctamente",
      categoriaAsignada: categoria?.nombre || "Sin categoría"
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error al registrar",
      detalle: error.message
    });
  }
};



/* ============================================================
   🟡 RECUPERAR CONTRASEÑA
============================================================ */
exports.recuperarPassword = async (req, res) => {
  try {

    const { correo } = req.body;
    const apoderado = await Apoderado.findOne({ correo });

    if (!apoderado)
      return res.status(404).json({ error: "Correo no registrado" });

    const nuevaPass = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(nuevaPass, 10);

    apoderado.password = hash;
    apoderado.debeCambiarPassword = true;

    await apoderado.save();

    return res.json({
      mensaje: "Contraseña temporal generada",
      nuevaPass
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error al generar contraseña",
      detalle: error.message
    });
  }
};



/* ============================================================
   🔵 CAMBIAR CONTRASEÑA TEMPORAL
============================================================ */
exports.cambiarPassword = async (req, res) => {
  try {

    const { id, passwordNueva } = req.body;

    const apoderado = await Apoderado.findById(id);
    if (!apoderado)
      return res.status(404).json({ error: "Apoderado no encontrado" });

    apoderado.password = await bcrypt.hash(passwordNueva, 10);
    apoderado.debeCambiarPassword = false;

    await apoderado.save();

    return res.json({
      mensaje: "Contraseña cambiada exitosamente"
    });

  } catch (error) {
    return res.status(500).json({
      error: "Error al cambiar contraseña",
      detalle: error.message
    });
  }
};
