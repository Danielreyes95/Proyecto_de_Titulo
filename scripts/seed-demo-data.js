require("dotenv").config();
const mongoose = require("mongoose");
const Escuela = require("../src/models/escuela.model");
const EscuelaCategoria = require("../src/models/escuela-categoria.model");
const EscuelaJugador = require("../src/models/escuela-jugador.model");
const EscuelaApoderado = require("../src/models/escuela-apoderado.model");
const Vinculo = require("../src/models/vinculo-jugador-apoderado.model");
const EscuelaEvento = require("../src/models/escuela-evento.model");
const { nombreClave } = require("../src/utils/categoria-escuela-validation");

const MARCADOR = "[DEMO SEED]";
const DEFAULT_SLUG = "los-leones-demo";
const JUGADORES_POR_CATEGORIA = 10;

const nombresJugadores = [
  "Benjamín Soto", "Martín Rojas", "Vicente Pérez", "Joaquín Muñoz", "Agustín Silva",
  "Matías Contreras", "Tomás Morales", "Lucas Herrera", "Diego Castro", "Nicolás Vega",
  "Felipe Navarro", "Sebastián Fuentes", "Cristóbal Torres", "Maximiliano Reyes", "Gabriel Molina",
  "Emiliano Salazar", "Samuel Araya", "Leonardo Campos", "Renato Valdés", "Franco Espinoza"
];

const nombresApoderados = [
  "Carolina Soto", "Patricio Rojas", "Marcela Pérez", "Andrés Muñoz", "Daniela Silva",
  "Rodrigo Contreras", "Paula Morales", "Claudio Herrera", "Verónica Castro", "Francisco Vega",
  "Andrea Navarro", "Mauricio Fuentes", "Lorena Torres", "Héctor Reyes", "Camila Molina",
  "Eduardo Salazar", "Natalia Araya", "Ricardo Campos", "Alejandra Valdés", "Gonzalo Espinoza"
];

function rutPrueba(cuerpo) {
  const texto = String(cuerpo);
  let suma = 0;
  let factor = 2;
  for (let i = texto.length - 1; i >= 0; i--) {
    suma += Number(texto[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const calculado = 11 - (suma % 11);
  const dv = calculado === 11 ? "0" : calculado === 10 ? "K" : String(calculado);
  return `${texto}-${dv}`;
}

function fechaNacimientoParaEdad(anio, edad, indice) {
  const mes = 6 + (indice % 4); // julio-octubre; después del 1 de enero.
  const dia = 5 + (indice % 20);
  const nacimientoAnio = anio - edad - 1;
  return new Date(Date.UTC(nacimientoAnio, mes, dia, 12, 0, 0));
}

function fechaDeportiva(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0));
}

function fechaFutura() {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + 14);
  fecha.setUTCHours(12, 0, 0, 0);
  return fecha;
}

async function asegurarCategoria(escuelaId, datos) {
  let categoria = await EscuelaCategoria.findOne({
    escuela: escuelaId,
    nombreClave: nombreClave(datos.nombre),
    modalidad: datos.modalidad
  });

  if (!categoria) {
    categoria = await EscuelaCategoria.create({
      escuela: escuelaId,
      nombre: datos.nombre,
      nombreClave: nombreClave(datos.nombre),
      modalidad: datos.modalidad,
      edadMin: datos.edadMin,
      edadMax: datos.edadMax,
      cupos: datos.cupos,
      estado: "activa"
    });
    console.log(`+ Categoría creada: ${categoria.nombre} · ${categoria.modalidad}`);
  }

  if (categoria.estado !== "activa") {
    throw new Error(`La categoría ${categoria.nombre} existe pero está inactiva. Actívala antes de cargar el demo.`);
  }
  return categoria;
}

async function asegurarApoderado(escuelaId, indiceGlobal) {
  const rut = rutPrueba(80000000 + indiceGlobal);
  return EscuelaApoderado.findOneAndUpdate(
    { escuela: escuelaId, rut },
    {
      $set: {
        nombre: nombresApoderados[indiceGlobal % nombresApoderados.length],
        email: `apoderado.demo.${String(indiceGlobal + 1).padStart(2, "0")}@example.com`,
        telefono: `+5697${String(1000000 + indiceGlobal).slice(-7)}`,
        estado: "activo"
      },
      $setOnInsert: { escuela: escuelaId, rut }
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function asegurarJugador(escuelaId, categoria, anio, indiceGlobal, indiceCategoria) {
  const rut = rutPrueba(70000000 + indiceGlobal);
  const rango = categoria.edadMax - categoria.edadMin + 1;
  const edad = categoria.edadMin + (indiceCategoria % rango);
  return EscuelaJugador.findOneAndUpdate(
    { escuela: escuelaId, rut },
    {
      $set: {
        nombre: nombresJugadores[indiceGlobal % nombresJugadores.length],
        fechaNacimiento: fechaNacimientoParaEdad(anio, edad, indiceCategoria),
        categoria: categoria._id,
        estado: "activo"
      },
      $setOnInsert: { escuela: escuelaId, rut }
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function asegurarVinculo(escuelaId, jugadorId, apoderadoId) {
  await Vinculo.findOneAndUpdate(
    { escuela: escuelaId, jugador: jugadorId, apoderado: apoderadoId },
    { $set: { estado: "activo" }, $setOnInsert: { escuela: escuelaId, jugador: jugadorId, apoderado: apoderadoId } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

function registrosCerrados(jugadores, eventoIndex, tipoEvento) {
  return jugadores.map((jugador, indice) => {
    const presente = (indice + eventoIndex) % 5 !== 0;
    const competitivo = tipoEvento === "Partido" || tipoEvento === "Torneo";
    const goles = presente && competitivo && (indice + eventoIndex) % 4 === 0 ? 1 : 0;
    const asistenciasGol = presente && competitivo && (indice + eventoIndex) % 5 === 1 ? 1 : 0;
    return {
      jugador: jugador._id,
      confirmacion: presente ? "asistira" : "no_asistira",
      asistencia: presente ? "presente" : "ausente",
      estadisticas: {
        goles,
        asistenciasGol,
        pasesClave: presente ? (indice + eventoIndex) % 4 : 0,
        recuperaciones: presente ? 2 + ((indice + eventoIndex) % 7) : 0,
        tirosArco: presente && competitivo ? goles + ((indice + 1) % 3) : 0,
        faltasCometidas: presente ? (indice + eventoIndex) % 3 : 0,
        faltasRecibidas: presente ? (indice + 2 * eventoIndex) % 3 : 0,
        amarilla: presente && competitivo && (indice + eventoIndex) % 9 === 0,
        roja: false,
        rendimiento: presente ? 6 + ((indice + eventoIndex) % 4) : null
      },
      observacion: presente ? "Registro ficticio generado para pruebas." : "Ausencia ficticia de prueba."
    };
  });
}

function registrosAbiertos(jugadores) {
  return jugadores.map((jugador, indice) => ({
    jugador: jugador._id,
    confirmacion: indice % 3 === 0 ? "asistira" : "pendiente",
    asistencia: "pendiente",
    estadisticas: {},
    observacion: ""
  }));
}

async function asegurarEvento({ escuelaId, categoria, fechaEvento, horaInicio, tipoEvento, descripcion, registros, cerrado }) {
  const filtroUnico = { escuela: escuelaId, categoria: categoria._id, fechaEvento, tipoEvento };
  const existente = await EscuelaEvento.findOne(filtroUnico);

  if (existente && !existente.descripcion.startsWith(MARCADOR)) {
    console.warn(`! Se omitió ${categoria.nombre} ${tipoEvento} ${fechaEvento.toISOString().slice(0, 10)}: ya existe un evento real en esa fecha.`);
    return { evento: existente, omitido: true };
  }

  if (existente) {
    existente.horaInicio = horaInicio;
    existente.descripcion = `${MARCADOR} ${descripcion}`;
    existente.registros = registros;
    existente.cerrado = cerrado;
    await existente.save();
    return { evento: existente, omitido: false };
  }

  const evento = await EscuelaEvento.create({
    ...filtroUnico,
    horaInicio,
    descripcion: `${MARCADOR} ${descripcion}`,
    registros,
    cerrado
  });
  return { evento, omitido: false };
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("El seed demo está bloqueado en NODE_ENV=production");
  }
  if (!process.env.MONGO_URI) throw new Error("Configura MONGO_URI antes de ejecutar el seed demo");

  const slug = (process.env.DEMO_SCHOOL_SLUG || DEFAULT_SLUG).trim().toLowerCase();
  const anio = Number(process.env.DEMO_SEASON_YEAR || new Date().getUTCFullYear());
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) throw new Error("DEMO_SEASON_YEAR inválido");

  await mongoose.connect(process.env.MONGO_URI);
  const escuela = await Escuela.findOne({ slug, estado: "activa" });
  if (!escuela) throw new Error(`No se encontró una escuela activa con slug ${slug}`);

  console.log(`Escuela demo: ${escuela.nombre} (${escuela.slug})`);
  console.log(`Temporada demo: ${anio}`);

  const categorias = [
    await asegurarCategoria(escuela._id, { nombre: "Sub 8", modalidad: "formativo", edadMin: 6, edadMax: 8, cupos: 20 }),
    await asegurarCategoria(escuela._id, { nombre: "sub 10", modalidad: "competitivo", edadMin: 9, edadMax: 10, cupos: 20 })
  ];

  const jugadoresPorCategoria = new Map();
  let global = 0;
  for (const categoria of categorias) {
    const lista = [];
    for (let i = 0; i < JUGADORES_POR_CATEGORIA; i++, global++) {
      const apoderado = await asegurarApoderado(escuela._id, global);
      const jugador = await asegurarJugador(escuela._id, categoria, anio, global, i);
      await asegurarVinculo(escuela._id, jugador._id, apoderado._id);
      lista.push(jugador);
    }
    jugadoresPorCategoria.set(String(categoria._id), lista);
  }

  let eventosGuardados = 0;
  let eventosOmitidos = 0;
  const planes = [
    { mes: 4, dia: 5, tipo: "Entrenamiento", hora: "18:00", texto: "Entrenamiento técnico" },
    { mes: 5, dia: 10, tipo: "Partido", hora: "11:00", texto: "Partido amistoso" },
    { mes: 6, dia: 7, tipo: "Entrenamiento", hora: "18:30", texto: "Entrenamiento táctico" },
    { mes: 7, dia: 12, tipo: "Torneo", hora: "10:00", texto: "Jornada de torneo" }
  ];

  for (const categoria of categorias) {
    const jugadores = jugadoresPorCategoria.get(String(categoria._id));
    for (let e = 0; e < planes.length; e++) {
      const plan = planes[e];
      const resultado = await asegurarEvento({
        escuelaId: escuela._id,
        categoria,
        fechaEvento: fechaDeportiva(anio, plan.mes, plan.dia),
        horaInicio: plan.hora,
        tipoEvento: plan.tipo,
        descripcion: `${plan.texto} · ${categoria.nombre}`,
        registros: registrosCerrados(jugadores, e, plan.tipo),
        cerrado: true
      });
      if (resultado.omitido) eventosOmitidos++; else eventosGuardados++;
    }

    const futuro = await asegurarEvento({
      escuelaId: escuela._id,
      categoria,
      fechaEvento: fechaFutura(),
      horaInicio: "18:00",
      tipoEvento: "Entrenamiento",
      descripcion: `Próximo entrenamiento · ${categoria.nombre}`,
      registros: registrosAbiertos(jugadores),
      cerrado: false
    });
    if (futuro.omitido) eventosOmitidos++; else eventosGuardados++;
  }

  console.log("\nDatos demo listos:");
  console.log(`- Categorías: ${categorias.length}`);
  console.log(`- Jugadores: ${global}`);
  console.log(`- Apoderados/contactos: ${global}`);
  console.log(`- Vínculos jugador-apoderado: ${global}`);
  console.log(`- Eventos demo guardados/actualizados: ${eventosGuardados}`);
  if (eventosOmitidos) console.log(`- Eventos omitidos por colisión con datos no demo: ${eventosOmitidos}`);
  console.log("\nPuedes volver a ejecutar el seed: reutiliza los mismos RUT demo y no duplica jugadores ni apoderados.");
}

main()
  .catch(error => {
    console.error("No se pudo cargar datos demo:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
