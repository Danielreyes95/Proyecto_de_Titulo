const Evento = require("../models/evento.model");
const Jugador = require("../models/jugador.model");
const Categoria = require("../models/categoria.model");
const Entrenador = require("../models/entrenador.model");

/* ============================================================
   🟢 Crear evento
============================================================ */
exports.crearEvento = async (req, res) => {
  try {
    const { categoriaId, entrenadorId, fechaEvento, tipoEvento } = req.body;

    if (!categoriaId || !entrenadorId || !fechaEvento || !tipoEvento) {
      return res
        .status(400)
        .json({ error: "Datos incompletos para crear el evento" });
    }

    const categoria = await Categoria.findById(categoriaId);
    if (!categoria)
      return res.status(404).json({ error: "Categoría no encontrada" });

    const entrenador = await Entrenador.findById(entrenadorId);
    if (!entrenador)
      return res.status(404).json({ error: "Entrenador no encontrado" });

    const evento = await Evento.create({
      categoria: categoriaId,
      entrenador: entrenadorId,
      fechaEvento: new Date(fechaEvento),
      tipoEvento,
      asistencia: [],
      cerrado: false
    });

    res.json({
      mensaje: "Evento programado correctamente",
      evento
    });
  } catch (error) {
    console.error("Error crearEvento:", error);
    res.status(500).json({ error: "Error al crear evento" });
  }
};

/* ============================================================
   🔵 Obtener detalle evento (para entrenador)
============================================================ */
exports.obtenerEvento = async (req, res) => {
  try {
    const { eventoId } = req.params;

    const evento = await Evento.findById(eventoId)
      .populate("categoria", "nombre")
      .populate("entrenador", "nombre correo")
      .populate("asistencia.jugador", "nombre rut");

    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    /* ============================================================
       🟢 GENERAR ASISTENCIA COMPLETA DE LA CATEGORÍA
         - Siempre obtener TODOS los jugadores de la categoría
         - Si existen registros en el evento, se mantienen
         - Si un jugador no está en asistencia[] → se agrega como "pendiente"
    ============================================================ */
    const jugadoresCategoria = await Jugador.find({
      categoria: evento.categoria._id
    });

    const asistenciaFinal = jugadoresCategoria.map((j) => {
      const existente = evento.asistencia.find((a) => {
        return String(a.jugador?._id || a.jugador) === String(j._id);
      });

      return existente
        ? {
            jugador: {
              _id: j._id,
              nombre: j.nombre,
              rut: j.rut
            },
            presente: existente.presente,
            observacion: existente.observacion,
            motivoInasistencia: existente.motivoInasistencia,
            goles: existente.goles,
            asistenciasGol: existente.asistenciasGol,
            pasesClave: existente.pasesClave,
            recuperaciones: existente.recuperaciones,
            tirosArco: existente.tirosArco,
            faltasCometidas: existente.faltasCometidas,
            faltasRecibidas: existente.faltasRecibidas,
            amarilla: existente.amarilla,
            roja: existente.roja
          }
        : {
            jugador: {
              _id: j._id,
              nombre: j.nombre,
              rut: j.rut
            },
            presente: null, // 🟡 Pendiente
            observacion: "",
            motivoInasistencia: "",
            goles: 0,
            asistenciasGol: 0,
            pasesClave: 0,
            recuperaciones: 0,
            tirosArco: 0,
            faltasCometidas: 0,
            faltasRecibidas: 0,
            amarilla: false,
            roja: false
          };
    });

    res.json({
      evento: {
        _id: evento._id,
        fecha: evento.fechaEvento,
        tipo: evento.tipoEvento,
        categoria: evento.categoria,
        entrenador: evento.entrenador,
        cerrado: evento.cerrado
      },
      asistencia: asistenciaFinal
    });
  } catch (error) {
    console.error("Error obtenerEvento:", error);
    res.status(500).json({ error: "Error al obtener evento" });
  }
};

/* ============================================================
   🔍 Detalle evento (para Director)
============================================================ */
exports.detalleEvento = async (req, res) => {
  try {
    const { eventoId } = req.params;

    const evento = await Evento.findById(eventoId)
      .populate("categoria", "nombre")
      .populate("entrenador", "nombre")
      .populate("asistencia.jugador", "nombre rut");

    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    res.json(evento);
  } catch (error) {
    console.error("Error detalleEvento:", error);
    res.status(500).json({ error: "Error al obtener detalle del evento" });
  }
};

/* ============================================================
   🟣 Registrar asistencia completa
============================================================ */
exports.registrarAsistenciaEvento = async (req, res) => {
  try {
    const { eventoId } = req.params;
    const { asistencia } = req.body;

    const evento = await Evento.findById(eventoId);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    if (evento.cerrado)
      return res.status(403).json({ error: "Evento cerrado" });

    evento.asistencia = asistencia;
    await evento.save();

    res.json({ mensaje: "Asistencia registrada correctamente", evento });
  } catch (error) {
    console.error("Error registrarAsistenciaEvento:", error);
    res.status(500).json({ error: "Error al registrar asistencia" });
  }
};

/* ============================================================
   🟠 Actualizar asistencia individual (CORREGIDO)
============================================================ */
exports.actualizarAsistenciaJugador = async (req, res) => {
  try {
    const { eventoId, jugadorId } = req.params;
    const {
      presente,
      observacion = "",
      motivoInasistencia = ""
    } = req.body;

    const evento = await Evento.findById(eventoId);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    if (evento.cerrado)
      return res.status(403).json({ error: "Evento cerrado" });

    // Buscar registro de asistencia del jugador
    let registro = evento.asistencia.find(
      (a) => String(a.jugador) === String(jugadorId)
    );

    // 🟢 Si no existe, lo creamos
    if (!registro) {
      registro = {
        jugador: jugadorId,
        presente: !!presente,
        observacion: observacion || "",
        motivoInasistencia: !!presente ? "" : motivoInasistencia || "",
        goles: 0,
        asistenciasGol: 0,
        pasesClave: 0,
        recuperaciones: 0,
        tirosArco: 0,
        faltasCometidas: 0,
        faltasRecibidas: 0,
        amarilla: false,
        roja: false
      };

      evento.asistencia.push(registro);
    } else {
      // 🟢 Si existe, actualizamos según lo enviado por el front
      registro.presente = !!presente;
      registro.observacion = observacion || "";
      registro.motivoInasistencia = !!presente ? "" : motivoInasistencia || "";
    }

    // 🔢 Recalcular porcentaje de asistencia del evento (para la respuesta)
    const total = evento.asistencia.length;
    const presentes = evento.asistencia.filter((a) => a.presente).length;
    const porcentajeAsistencia =
      total > 0 ? Math.round((presentes / total) * 100) : 0;

    await evento.save();

    return res.json({
      mensaje: "Asistencia actualizada correctamente",
      asistencia: registro,
      porcentajeAsistencia
    });
  } catch (error) {
    console.error("Error actualizarAsistenciaJugador:", error);
    res.status(500).json({ error: "Error al actualizar asistencia" });
  }
};

/* ============================================================
   🟡 Listar eventos por categoría (CORREGIDO PARA DIRECTOR Y ENTRENADOR)
============================================================ */
exports.listarEventosPorCategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;

    const eventos = await Evento.find({ categoria: categoriaId })
      .populate("asistencia.jugador", "nombre rut")
      .sort({ fechaEvento: -1 });

    const respuesta = eventos.map((e) => {
      const total = e.asistencia.length;
      const presentes = e.asistencia.filter((a) => a.presente).length;
      const porcentaje =
        total > 0 ? ((presentes * 100) / total).toFixed(1) : 0;

      return {
        _id: e._id,
        fechaEvento: e.fechaEvento,
        tipoEvento: e.tipoEvento,
        asistencia: e.asistencia, // 🔥 IMPORTANTE
        porcentajeAsistencia: porcentaje,
        cerrado: e.cerrado
      };
    });

    res.json(respuesta);
  } catch (error) {
    console.error("Error listarEventosPorCategoria:", error);
    res.status(500).json({ error: "Error al listar eventos" });
  }
};

/* ============================================================
   🗑 Eliminar evento
============================================================ */
exports.eliminarEvento = async (req, res) => {
  try {
    const { eventoId } = req.params;

    const eliminado = await Evento.findByIdAndDelete(eventoId);
    if (!eliminado)
      return res.status(404).json({ error: "Evento no encontrado" });

    res.json({ mensaje: "Evento eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminarEvento:", error);
    res.status(500).json({ error: "Error al eliminar evento" });
  }
};

/* ============================================================
   🔒 Cerrar evento
============================================================ */
exports.cerrarEvento = async (req, res) => {
  try {
    const { eventoId } = req.params;

    const evento = await Evento.findById(eventoId);
    if (!evento) return res.status(404).json({ error: "Evento no encontrado" });

    evento.cerrado = true;
    await evento.save();

    res.json({ mensaje: "Evento cerrado correctamente" });
  } catch (error) {
    console.error("Error cerrarEvento:", error);
    res.status(500).json({ error: "Error al cerrar evento" });
  }
};

/* ============================================================
   📊 Asistencia detallada por jugador
============================================================ */
exports.asistenciaPorJugador = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    const eventos = await Evento.find({
      "asistencia.jugador": jugadorId
    }).sort({ fechaEvento: -1 });

    const detalle = eventos.map((e) => {
      const reg = e.asistencia.find(
        (r) => String(r.jugador) === String(jugadorId)
      );

      return {
        fechaEvento: e.fechaEvento,
        tipoEvento: e.tipoEvento,
        presente: reg?.presente || false,
        observacion: reg?.observacion || "",
        motivoInasistencia: reg?.motivoInasistencia || "",
        goles: reg?.goles || 0,
        asistenciasGol: reg?.asistenciasGol || 0,
        pasesClave: reg?.pasesClave || 0,
        recuperaciones: reg?.recuperaciones || 0,
        tirosArco: reg?.tirosArco || 0,
        faltasCometidas: reg?.faltasCometidas || 0,
        faltasRecibidas: reg?.faltasRecibidas || 0,
        amarilla: reg?.amarilla || false,
        roja: reg?.roja || false
      };
    });

    res.json(detalle);
  } catch (error) {
    console.error("Error asistenciaPorJugador:", error);
    res
      .status(500)
      .json({ error: "Error al obtener asistencia del jugador" });
  }
};

/* ============================================================
   📈 Estadísticas jugador
============================================================ */
exports.estadisticasJugador = async (req, res) => {
  try {
    const { jugadorId } = req.params;

    // 👉 Solo eventos donde el jugador tiene registro de asistencia
    //    Y el evento está CERRADO
    const eventos = await Evento.find({
      "asistencia.jugador": jugadorId,
      cerrado: true
    });

    let total = 0, asistio = 0, falto = 0;
    let goles = 0, asistenciasGol = 0, pasesClave = 0;
    let recuperaciones = 0, tirosArco = 0;
    let faltasCometidas = 0, faltasRecibidas = 0;
    let amarillas = 0, rojas = 0;

    eventos.forEach(e => {
      const reg = e.asistencia.find(r => String(r.jugador) === String(jugadorId));
      if (!reg) return;

      total++;

      if (reg.presente) asistio++;
      else falto++;

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

    const porcentaje = total > 0 ? Number(((asistio / total) * 100).toFixed(1)) : 0;

    res.json({
      totalEventos: total,
      asistio,
      falto,
      porcentaje,
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

  } catch (error) {
    console.error("Error estadisticasJugador:", error);
    res.status(500).json({ error: "Error al obtener estadísticas del jugador" });
  }
};

/* ============================================================
   📅 LISTAR TODOS LOS EVENTOS (DIRECTOR)
============================================================ */
exports.listarTodosEventos = async (req, res) => {
  try {
    const eventos = await Evento.find()
      .populate("categoria", "nombre")
      .populate("entrenador", "nombre")
      .sort({ fechaEvento: -1 });

    const respuesta = eventos.map((e) => {
      const total = e.asistencia.length;
      const presentes = e.asistencia.filter((a) => a.presente).length;
      const porcentaje =
        total > 0 ? ((presentes * 100) / total).toFixed(1) : 0;

      return {
        _id: e._id,

        // ✅ FECHA 100% COMPATIBLE PARA FRONTEND
        fechaEvento: e.fechaEvento ? new Date(e.fechaEvento) : null,

        // ✅ TIPO DE EVENTO (antes salía undefined)
        tipoEvento: e.tipoEvento ?? "Sin tipo",

        // ⭐ INFO COMPLETA
        categoria: e.categoria?.nombre ?? "Sin categoría",
        entrenador: e.entrenador?.nombre ?? "Director",

        asistencia: e.asistencia,
        porcentajeAsistencia: porcentaje,
        cerrado: e.cerrado
      };
    });

    res.json(respuesta);
  } catch (error) {
    console.error("Error listarTodosEventos:", error);
    res.status(500).json({ error: "Error al obtener eventos" });
  }
};

exports.crearEventoDirector = async (req, res) => {
  try {
    const { fechaEvento, tipoEvento, categoriaId, descripcion } = req.body;

    const evento = await Evento.create({
      categoria: categoriaId,
      entrenador: null, // Director crea, no asigna entrenador
      fechaEvento,
      tipoEvento,
      descripcion,
      asistencia: [],
      cerrado: false
    });

    res.json({ mensaje: "Evento creado correctamente", evento });
  } catch (error) {
    console.error("Error crearEventoDirector:", error);
    res.status(500).json({ error: "Error al crear evento" });
  }
};
