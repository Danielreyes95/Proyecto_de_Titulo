const Asistencia = require("../models/asistencia.model");
const Jugador = require("../models/jugador.model");
const Categoria = require("../models/categoria.model");
const Entrenador = require("../models/entrenador.model");
const Evento = require("../models/evento.model");

/* ============================================================
   🟢 Registrar asistencia
============================================================ */
exports.registrarAsistencia = async (req, res) => {
  try {
    const { jugadorId, entrenadorId, tipoEvento, fechaEvento, asistencia, comentario } = req.body;

    const entrenador = await Entrenador.findById(entrenadorId);
    if (!entrenador)
      return res.status(404).json({ error: "Entrenador no encontrado" });

    const jugador = await Jugador.findById(jugadorId).populate("categoria");
    if (!jugador)
      return res.status(404).json({ error: "Jugador no encontrado" });

    if (String(jugador.categoria._id) !== String(entrenador.categoria)) {
      return res.status(403).json({
        error: "El jugador no pertenece a la categoría del entrenador."
      });
    }

    const nuevo = await Asistencia.create({
      jugador: jugadorId,
      entrenador: entrenadorId,
      categoria: entrenador.categoria,
      tipoEvento,
      fechaEvento,
      asistencia,
      comentario
    });

    res.json({
      mensaje: "✅ Asistencia registrada correctamente",
      asistencia: nuevo
    });

  } catch (error) {
    res.status(500).json({ error: "Error al registrar asistencia", detalle: error.message });
  }
};

/* ============================================================
   🟡 Asistencias por jugador
============================================================ */
exports.obtenerAsistenciasPorJugador = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    // Buscar eventos CERRADOS
    const eventos = await Evento.find({ cerrado: true })
      .populate("categoria", "nombre")
      .populate("entrenador", "nombre correo")
      .lean();

    const registros = [];

    eventos.forEach(ev => {
      ev.asistencia.forEach(a => {
        if (String(a.jugador) === jugadorId) {

          registros.push({
            fechaEvento: ev.fechaEvento,
            tipoEvento: ev.tipoEvento,
            categoria: ev.categoria,
            entrenador: ev.entrenador,
            presente: a.presente,
            observacion: a.observacion,
            motivoInasistencia: a.motivoInasistencia,

            // estadísticas individuales
            goles: a.goles,
            asistenciasGol: a.asistenciasGol,
            pasesClave: a.pasesClave,
            recuperaciones: a.recuperaciones,
            tirosArco: a.tirosArco,
            faltasCometidas: a.faltasCometidas,
            faltasRecibidas: a.faltasRecibidas,
            amarilla: a.amarilla,
            roja: a.roja,
            rendimiento: a.rendimiento
          });

        }
      });
    });

    return res.json({
      mensaje: "Asistencias del jugador obtenidas",
      registros
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener asistencias reales del jugador",
      detalle: error.message
    });
  }
};

/* ============================================================
   🟣 Asistencias por categoría
============================================================ */
exports.obtenerAsistenciasPorCategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;

    const registros = await Asistencia.find({ categoria: categoriaId })
      .populate("jugador", "nombre rut")
      .populate("entrenador", "nombre")
      .sort({ fechaEvento: -1 });

    res.json({
      mensaje: "Asistencias de la categoría obtenidas",
      registros
    });

  } catch (error) {
    res.status(500).json({ error: "Error al obtener asistencias por categoría", detalle: error.message });
  }
};

/* ============================================================
   🔵 Actualizar asistencia
============================================================ */
exports.actualizarAsistencia = async (req, res) => {
  try {
    const { id } = req.params;
    const { asistencia, comentario } = req.body;

    const registro = await Asistencia.findByIdAndUpdate(
      id,
      { asistencia, comentario },
      { new: true }
    );

    if (!registro)
      return res.status(404).json({ error: "Registro no encontrado" });

    res.json({
      mensaje: "Asistencia actualizada correctamente",
      registro
    });

  } catch (error) {
    res.status(500).json({ error: "Error al actualizar asistencia", detalle: error.message });
  }
};

/* ============================================================
   🟩 Estadísticas por categoría
============================================================ */
exports.asistenciaPorCategoria = async (req, res) => {
  try {
    const { idCategoria } = req.params;
    const { tipo } = req.query;

    const jugadores = await Jugador.find({ categoria: idCategoria })
      .select("nombre rut fechaNacimiento");

    if (jugadores.length === 0) {
      return res.json({
        totalEventos: 0,
        promedioAsistencia: 0,
        jugadores: []
      });
    }

    const filtro = { categoria: idCategoria };
    if (tipo) filtro.tipoEvento = tipo;

    const asistencias = await Asistencia.find(filtro);

    const totalEventos = asistencias.length;

    if (totalEventos === 0) {
      return res.json({
        totalEventos: 0,
        promedioAsistencia: 0,
        jugadores: jugadores.map(j => ({
          jugador: j.nombre,
          asistio: 0,
          falto: 0,
          porcentaje: 0
        }))
      });
    }

    const detalles = jugadores.map(jugador => {
      const registrosJugador = asistencias.filter(a =>
        String(a.jugador) === String(jugador._id)
      );

      const asistio = registrosJugador.filter(a => a.asistencia).length;
      const falto = registrosJugador.filter(a => !a.asistencia).length;

      const porcentaje = registrosJugador.length > 0
        ? Number(((asistio / registrosJugador.length) * 100).toFixed(1))
        : 0;

      return {
        jugador: jugador.nombre,
        asistio,
        falto,
        porcentaje
      };
    });

    const promedioAsistencia = Number(
      (detalles.reduce((acc, j) => acc + j.porcentaje, 0) / detalles.length)
        .toFixed(1)
    );

    res.json({
      totalEventos,
      promedioAsistencia,
      jugadores: detalles
    });

  } catch (error) {
    res.status(500).json({
      error: "Error al calcular asistencia",
      detalle: error.message
    });
  }
};

/* ============================================================
   📌 Estadísticas por jugador
============================================================ */
exports.estadisticasJugador = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    const registros = await Asistencia.find({ jugador: jugadorId });

    const total = registros.length;
    const asistencias = registros.filter(r => r.asistencia === true).length;
    const faltas = registros.filter(r => r.asistencia === false).length;

    const porcentaje = total > 0
      ? Number(((asistencias / total) * 100).toFixed(1))
      : 0;

    res.json({
      total,
      asistencias,
      faltas,
      porcentaje
    });

  } catch (error) {
    res.status(500).json({ error: "Error al calcular estadísticas", detalle: error.message });
  }
};

/* ============================================================
   🔎 Detalle por jugador
============================================================ */
exports.detalleJugador = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    const registros = await Asistencia.find({ jugador: jugadorId })
      .sort({ fechaEvento: -1 });

    res.json(registros);

  } catch (error) {
    res.status(500).json({ error: "Error al obtener detalle", detalle: error.message });
  }
};

/* ============================================================
   🟧 Eventos por categoría (agrupados por fecha + tipo)
============================================================ */
exports.eventosPorCategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;

    const registros = await Asistencia.find({ categoria: categoriaId })
      .sort({ fechaEvento: -1 });

    const map = new Map();

    registros.forEach(r => {
      const fecha = r.fechaEvento.toISOString().split("T")[0];
      const key = `${fecha}-${r.categoria}-${r.tipoEvento}`;

      if (!map.has(key)) {
        map.set(key, {
          _id: key,
          fecha,
          tipo: r.tipoEvento,
          categoria: r.categoria,
          total: 0,
          asistencias: 0
        });
      }

      const evt = map.get(key);
      evt.total++;
      if (r.asistencia) evt.asistencias++;
    });

    const eventos = Array.from(map.values()).map(e => ({
      _id: e._id,
      fecha: e.fecha,
      tipo: e.tipo,
      porcentaje: Number(((e.asistencias / e.total) * 100).toFixed(1))
    }));

    res.json(eventos);

  } catch (error) {
    res.status(500).json({ error: "Error al obtener eventos", detalle: error.message });
  }
};

/* ============================================================
   🔍 Detalle del evento REAL (fecha + categoría + tipo)
============================================================ */
exports.detalleEvento = async (req, res) => {
  try {
    const { idEvento } = req.params;

    const partes = idEvento.split("-");
    const fechaISO = partes[0];
    const categoriaId = partes[1];
    const tipoEvento = partes[2];

    if (!fechaISO || !categoriaId || !tipoEvento) {
      return res.status(400).json({ error: "ID de evento inválido" });
    }

    const registros = await Asistencia.find({
      categoria: categoriaId,
      tipoEvento,
      fechaEvento: {
        $gte: new Date(fechaISO + "T00:00:00"),
        $lte: new Date(fechaISO + "T23:59:59")
      }
    })
      .populate("jugador", "nombre rut")
      .populate("entrenador", "nombre")
      .populate("categoria", "nombre");

    if (registros.length === 0) {
      return res.status(404).json({ error: "Evento no encontrado" });
    }

    res.json({
      evento: {
        fecha: fechaISO,
        tipo: tipoEvento,
        categoria: registros[0].categoria.nombre,
        entrenador: registros[0].entrenador.nombre
      },
      registros
    });

  } catch (error) {
    res.status(500).json({
      error: "Error al obtener detalle del evento",
      detalle: error.message
    });
  }
};

/* ============================================================
   ❌ Eliminar evento completo (por fecha + tipo + categoría)
============================================================ */
exports.eliminarEvento = async (req, res) => {
  try {
    const { idEvento } = req.params;

    const partes = idEvento.split("-");
    const fechaISO = partes[0];
    const categoriaId = partes[1];
    const tipoEvento = partes[2];

    await Asistencia.deleteMany({
      categoria: categoriaId,
      tipoEvento,
      fechaEvento: {
        $gte: new Date(fechaISO + "T00:00:00"),
        $lte: new Date(fechaISO + "T23:59:59")
      }
    });

    res.json({ mensaje: "Evento eliminado correctamente" });

  } catch (error) {
    res.status(500).json({
      error: "Error al eliminar evento",
      detalle: error.message
    });
  }
};
