const Categoria = require("../models/categoria.model");
const Jugador = require("../models/jugador.model");
const Evento = require("../models/evento.model");  // ✔ importante

/* ============================================================
   📌 RESUMEN GENERAL POR CATEGORÍA
   - porcentaje asistencia global
   - goles, tarjetas (si existen campos)
============================================================ */
exports.obtenerResumenGeneral = async (req, res) => {
    try {
        const categorias = await Categoria.find()
            .populate("entrenador", "nombre");

        const resumen = [];

        for (const cat of categorias) {

            const jugadores = await Jugador.countDocuments({ categoria: cat._id });

            // traer todos los eventos de la categoría
            const eventos = await Evento.find({ categoria: cat._id });

            let totalEventos = 0;
            let sumaAsistencia = 0;

            eventos.forEach(ev => {
                const total = ev.asistencia.length;
                const presentes = ev.asistencia.filter(a => a.presente).length;

                if (total > 0) {
                    const porcentaje = (presentes * 100) / total;
                    sumaAsistencia += porcentaje;
                    totalEventos++;
                }
            });

            const asistenciaPromedio =
                totalEventos > 0 ? (sumaAsistencia / totalEventos).toFixed(1) : 0;

            resumen.push({
                categoria: cat.nombre,
                entrenador: cat.entrenador ? cat.entrenador.nombre : "Sin asignar",
                totalJugadores: jugadores,
                asistenciaPromedio: `${asistenciaPromedio}%`
            });
        }

        res.json({
            mensaje: "Resumen general generado correctamente",
            resumen
        });

    } catch (error) {
        res.status(500).json({ error: "Error al generar resumen", detalle: error.message });
    }
};


/* ============================================================
   📌 RESUMEN INDIVIDUAL JUGADOR
============================================================ */
exports.obtenerResumenJugador = async (req, res) => {
    try {
        const { jugadorId } = req.params;

        const jugador = await Jugador.findById(jugadorId)
            .populate("categoria", "nombre");

        if (!jugador)
            return res.status(404).json({ error: "Jugador no encontrado" });

        // traer todos los eventos donde figura el jugador
        const eventos = await Evento.find({
            "asistencia.jugador": jugadorId
        });

        let totalEventos = 0;
        let asistio = 0;

        eventos.forEach(ev => {
            const reg = ev.asistencia.find(a => String(a.jugador) === jugadorId);

            if (reg) {
                totalEventos++;
                if (reg.presente) asistio++;
            }
        });

        const porcentaje =
            totalEventos > 0 ? ((asistio / totalEventos) * 100).toFixed(1) : 0;

        res.json({
            jugador: jugador.nombre,
            categoria: jugador.categoria ? jugador.categoria.nombre : "Sin categoría",
            resumen: {
                totalEventos,
                asistio,
                porcentaje: `${porcentaje}%`
            }
        });

    } catch (error) {
        res.status(500).json({
            error: "Error al obtener resumen del jugador",
            detalle: error.message
        });
    }
};


/* ============================================================
   📅 📌 ASISTENCIA MENSUAL (SOLO EVENTOS CERRADOS)
   - EXCLUSIVO PARA EL DASHBOARD DEL DIRECTOR
============================================================ */
exports.asistenciaMensual = async (req, res) => {
    try {
        const hoy = new Date();
        const mes = hoy.getMonth();
        const año = hoy.getFullYear();

        const inicio = new Date(año, mes, 1);
        const fin = new Date(año, mes + 1, 0, 23, 59, 59);

        const eventos = await Evento.find({
            cerrado: true,
            fechaEvento: { $gte: inicio, $lte: fin }
        });

        if (eventos.length === 0)
            return res.json({ asistenciaMensual: 0 });

        let suma = 0;
        let utiles = 0;

        eventos.forEach(ev => {
            const total = ev.asistencia.length;
            const presentes = ev.asistencia.filter(a => a.presente).length;

            if (total > 0) {
                const porcentaje = (presentes * 100) / total;
                suma += porcentaje;
                utiles++;
            }
        });

        const promedio = utiles > 0 ? Number((suma / utiles).toFixed(1)) : 0;

        res.json({ asistenciaMensual: promedio });

    } catch (error) {
        console.error("Error asistenciaMensual:", error);
        res.status(500).json({
            error: "Error al calcular asistencia mensual"
        });
    }
};


/* ============================================================
   📌 HISTORIAL COMPLETO POR JUGADOR (EVENTOS + ASISTENCIA)
============================================================ */
exports.historialJugador = async (req, res) => {
    try {
        const { jugadorId } = req.params;

        const eventos = await Evento.find({
            "asistencia.jugador": jugadorId
        }).sort({ fechaEvento: -1 });

        const historial = eventos.map(ev => {
            const reg = ev.asistencia.find(a => String(a.jugador) === jugadorId);

            return {
                fecha: ev.fechaEvento,
                tipoEvento: ev.tipoEvento,
                presente: reg?.presente || false,
                observacion: reg?.observacion || "",
                motivoInasistencia: reg?.motivoInasistencia || ""
            };
        });

        res.json(historial);

    } catch (error) {
        res.status(500).json({
            error: "Error al obtener historial",
            detalle: error.message
        });
    }
};
