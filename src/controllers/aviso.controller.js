const Aviso = require("../models/aviso.model");
const Apoderado = require("../models/apoderado.model");
const Entrenador = require("../models/entrenador.model");
const Jugador = require("../models/jugador.model");
const { enviarCorreo } = require("../utils/email");

/* ================================
   LISTAR AVISOS
================================ */
exports.listarAvisos = async (req, res) => {
  try {
    // Usamos .lean() para poder clonar fácilmente los objetos
    let avisos = await Aviso.find().sort({ createdAt: -1 }).lean();

    // ✅ IDs usados en avisos dirigidos a un apoderado/jugador específico
    const idsDestinatarios = avisos
      .filter(a => a.destinatario === "ApoderadoEspecifico" && a.destinatarioId)
      .map(a => a.destinatarioId);

    // ✅ IDs de entrenadores para avisos a EntrenadorEspecifico (por si los usas después)
    const idsEntrenadores = avisos
      .filter(a => a.destinatario === "EntrenadorEspecifico" && a.destinatarioId)
      .map(a => a.destinatarioId);

    /* ==========================================
       🔍 Jugadores (por jugadorId o apoderadoId)
       ========================================== */
    const jugadoresMapPorJugadorId = {};
    const jugadoresMapPorApoderadoId = {};

    if (idsDestinatarios.length > 0) {
      const jugadores = await Jugador.find({
        $or: [
          { _id: { $in: idsDestinatarios } },          // caso: destinatarioId = jugador._id
          { apoderado: { $in: idsDestinatarios } }     // caso: destinatarioId = apoderado._id
        ]
      }).populate("apoderado", "nombre");

      jugadores.forEach(j => {
        jugadoresMapPorJugadorId[String(j._id)] = j;
        if (j.apoderado) {
          jugadoresMapPorApoderadoId[String(j.apoderado._id)] = j;
        }
      });
    }

    /* ==========================================
       🔍 Entrenadores específicos
       ========================================== */
    const entrenadoresMap = {};
    if (idsEntrenadores.length > 0) {
      const entrenadores = await Entrenador.find({
        _id: { $in: idsEntrenadores }
      });
      entrenadores.forEach(e => {
        entrenadoresMap[String(e._id)] = e;
      });
    }

    // Agregar un campo calculado: destinatarioTexto
    avisos = avisos.map(a => {
      let destinatarioTexto = null;

      if (a.destinatario === "ApoderadoEspecifico" && a.destinatarioId) {
        const id = String(a.destinatarioId);

        const j =
          jugadoresMapPorJugadorId[id] ||
          jugadoresMapPorApoderadoId[id];

        if (j) {
          destinatarioTexto = `${j.nombre} (Apoderado: ${
            j.apoderado?.nombre || "Sin apoderado"
          })`;
        } else {
          destinatarioTexto = "Apoderado / jugador específico";
        }

      } else if (a.destinatario === "EntrenadorEspecifico" && a.destinatarioId) {
        const e = entrenadoresMap[String(a.destinatarioId)];
        destinatarioTexto = e ? `Entrenador: ${e.nombre}` : "Entrenador específico";
      }

      return {
        ...a,
        destinatarioTexto
      };
    });

    res.json(avisos);
  } catch (error) {
    console.error("Error listarAvisos:", error);
    res.status(500).json({ error: "Error al listar avisos" });
  }
};

/* ================================
   CREAR AVISO
================================ */
exports.crearAviso = async (req, res) => {
  try {
    const {
      titulo,
      tipo,
      destinatario,
      destinatarioId,
      categoriaId,
      fechaEvento,
      contenido,
      creadorId,          // 👈 AHORA EL NOMBRE COINCIDE CON EL FRONT
    } = req.body;

    if (!titulo || !contenido) {
      return res
        .status(400)
        .json({ error: "Título y contenido son obligatorios." });
    }

    // 1️⃣ Crear aviso en BD (guardando creadorId)
    const nuevoAviso = await Aviso.create({
      titulo,
      tipo: tipo || "General",
      destinatario,
      destinatarioId: destinatarioId || null,
      fechaEvento: fechaEvento || null,
      contenido,
      categoriaId: categoriaId || null,
      creadorId: creadorId || null,
    });

    /* =====================================================
       2️⃣ Construcción de lista de correos
    ====================================================== */
    let listaCorreos = [];

    // APODERADOS (puede venir o no una categoría)
    if (destinatario === "Apoderados") {
      if (!categoriaId) {
        // Sin categoría → todos los apoderados
        const apoderados = await Apoderado.find({}, "correo");
        listaCorreos = apoderados.map((a) => a.correo);
      } else {
        // Solo apoderados de esa categoría
        const jugadores = await Jugador.find({ categoria: categoriaId }).populate(
          "apoderado",
          "correo"
        );

        listaCorreos = jugadores
          .map((j) => j.apoderado?.correo)
          .filter(Boolean);
      }
    }

    // ENTRENADORES
    else if (destinatario === "Entrenadores") {
      const entrenadores = await Entrenador.find({}, "correo");
      listaCorreos = entrenadores.map((e) => e.correo);
    }

    // TODOS (apoderados + entrenadores)
    else if (destinatario === "Todos") {
      const apoderados = await Apoderado.find({}, "correo");
      const entrenadores = await Entrenador.find({}, "correo");
      listaCorreos = [
        ...apoderados.map((a) => a.correo),
        ...entrenadores.map((e) => e.correo),
      ];
    }

    // ENTRENADOR ESPECÍFICO
    else if (destinatario === "EntrenadorEspecifico") {
      const entrenador = await Entrenador.findById(destinatarioId);
      if (entrenador?.correo) listaCorreos = [entrenador.correo];
    }

    // APODERADO ESPECÍFICO (jugador específico)
    else if (destinatario === "ApoderadoEspecifico") {
      const jugador = await Jugador.findById(destinatarioId).populate(
        "apoderado",
        "correo"
      );

      if (!jugador || !jugador.apoderado?.correo) {
        return res.status(400).json({ error: "Apoderado sin correo." });
      }

      listaCorreos = [jugador.apoderado.correo];
    }

    // Eliminar duplicados
    listaCorreos = [...new Set(listaCorreos)];

    /* =====================================================
       3️⃣ Enviar correo
    ====================================================== */
    if (listaCorreos.length > 0) {
      const htmlContent = `
        <div style="font-family: Arial; padding: 20px;">
          <h2 style="color: #2e7d32;">${titulo}</h2>
          <p><b>Tipo:</b> ${tipo || "General"}</p>
          ${
            fechaEvento
              ? `<p><b>Fecha:</b> ${new Date(
                  fechaEvento
                ).toLocaleDateString("es-CL")}</p>`
              : ""
          }
          <p style="white-space: pre-line;">${contenido}</p>
        </div>
      `;

      await enviarCorreo(listaCorreos, `Aviso: ${titulo}`, htmlContent);
    }

    /* =====================================================
       4️⃣ Socket.io
    ====================================================== */
    if (global.io) {
      if (destinatario === "Todos")
        global.io.emit("nuevo-aviso", nuevoAviso);
      else if (destinatario === "Entrenadores")
        global.io.to("entrenador").emit("nuevo-aviso", nuevoAviso);
      else if (destinatario === "Apoderados")
        global.io.to("apoderado").emit("nuevo-aviso", nuevoAviso);
      else global.io.to(`user:${destinatarioId}`).emit("nuevo-aviso", nuevoAviso);
    }

    res.json({ mensaje: "Aviso creado correctamente", aviso: nuevoAviso });
  } catch (error) {
    console.error("Error crearAviso:", error);
    res
      .status(500)
      .json({ error: "Error al crear aviso", detalle: error.message });
  }
};

/* ================================
   EDITAR AVISO
================================ */
exports.editarAviso = async (req, res) => {
  try {
    const avisoEditado = await Aviso.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(avisoEditado);
  } catch (error) {
    console.error("Error editarAviso:", error);
    res.status(500).json({ error: "Error al editar aviso" });
  }
};

/* ================================
   ELIMINAR AVISO
================================ */
exports.eliminarAviso = async (req, res) => {
  try {
    await Aviso.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Aviso eliminado" });
  } catch (error) {
    console.error("Error eliminarAviso:", error);
    res.status(500).json({ error: "Error al eliminar aviso" });
  }
};