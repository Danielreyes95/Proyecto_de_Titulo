const mongoose = require("mongoose");
const EscuelaJugador = require("../models/escuela-jugador.model");
const EscuelaApoderado = require("../models/escuela-apoderado.model");
const Vinculo = require("../models/vinculo-jugador-apoderado.model");
const EscuelaCategoria = require("../models/escuela-categoria.model");
const {
  validarJugador, validarApoderado, edadAnual, id
} = require("../utils/jugador-escuela-validation");

function tenant(req) { return req.contextoEscuela.escuela._id; }
function fail(error, res, next) {
  if (error.status === 400 || error.name === "ValidationError") {
    return res.status(400).json({ error: error.status === 400 ?
      error.message : "Datos inválidos" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "Ya existe este registro o vínculo en la escuela" });
  }
  if (error.name === "VersionError" || error.hasErrorLabel?.("TransientTransactionError")) {
    return res.status(409).json({ error: "Conflicto de actualización. Intenta nuevamente." });
  }
  return next(error);
}
function err(message) {
  const e = new Error(message); e.status = 400; throw e;
}
function validCategory(categoria, birth) {
  if (!categoria) err("Categoría no disponible en esta escuela");
  const edad = edadAnual(birth);
  if (edad < categoria.edadMin || edad > categoria.edadMax) {
    err("La edad al 1 de enero no corresponde al rango de la categoría");
  }
}
async function apoderados(req, res, next) {
  try {
    const docs = await EscuelaApoderado.find({ escuela: tenant(req) })
      .select("nombre rut email telefono estado")
      .sort({ nombre: 1 }).limit(200).lean();
    return res.json({ apoderados: docs });
  } catch (error) { next(error); }
}
async function crearApoderado(req, res, next) {
  try {
    const body = validarApoderado(req.body);
    const apoderado = await EscuelaApoderado.create({
      ...body, escuela: tenant(req)
    });
    return res.status(201).json({ apoderado });
  } catch (error) { return fail(error, res, next); }
}
async function listar(req, res, next) {
  try {
    const escuela = tenant(req);
    const filtro = { escuela };
    if (req.query.categoriaId !== undefined) {
      filtro.categoria = id(req.query.categoriaId);
    }
    const jugadores = await EscuelaJugador.find(filtro)
      .select("nombre rut fechaNacimiento categoria estado createdAt")
      .populate({ path: "categoria",
        select: "nombre modalidad estado", match: { escuela } })
      .sort({ nombre: 1 }).limit(200).lean();
    const ids = jugadores.map(j => j._id);
    const vinculos = await Vinculo.find({
      escuela, jugador: { $in: ids }, estado: "activo"
    }).select("jugador apoderado").populate({
      path: "apoderado",
      select: "nombre email telefono estado",
      match: { escuela, estado: "activo" }
    }).lean();
    const byJugador = new Map();
    for (const v of vinculos) {
      if (!v.apoderado) continue;
      const key = String(v.jugador);
      byJugador.set(key, [...(byJugador.get(key) || []), v.apoderado]);
    }
    return res.json({ jugadores: jugadores.map(j => ({
      ...j, apoderados: byJugador.get(String(j._id)) || []
    })) });
  } catch (error) { return fail(error, res, next); }
}
async function crear(req, res, next) {
  let session;
  try {
    if (!req.body || typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        !Object.hasOwn(req.body, "apoderadoId")) err("Apoderado obligatorio");
    const { apoderadoId, ...jugadorBody } = req.body;
    const apoderadoIdentificador = id(apoderadoId);
    const fields = validarJugador(jugadorBody, true);
    const escuela = tenant(req);
    session = await mongoose.startSession();
    let creado;
    await session.withTransaction(async () => {
      const [categoria, apoderado] = await Promise.all([
        EscuelaCategoria.findOne({
          _id: fields.categoria, escuela, estado: "activa"
        }).session(session),
        EscuelaApoderado.findOne({
          _id: apoderadoIdentificador, escuela, estado: "activo"
        }).session(session)
      ]);
      validCategory(categoria, fields.fechaNacimiento);
      if (!apoderado) err("Apoderado no disponible en esta escuela");
      const [jugador] = await EscuelaJugador.create([{
        ...fields, escuela
      }], { session });
      await Vinculo.create([{
        escuela, jugador: jugador._id, apoderado: apoderado._id, estado: "activo"
      }], { session });
      creado = jugador;
    });
    return res.status(201).json({ jugador: creado });
  } catch (error) { return fail(error, res, next); }
  finally { if (session) await session.endSession(); }
}
async function actualizar(req, res, next) {
  try {
    const jugadorId = id(req.params.jugadorId);
    const fields = validarJugador(req.body);
    const escuela = tenant(req);
    const jugador = await EscuelaJugador.findOne({ _id: jugadorId, escuela });
    if (!jugador) return res.status(404).json({ error: "Jugador no encontrado" });
    const categoryId = fields.categoria || jugador.categoria;
    const birth = fields.fechaNacimiento || jugador.fechaNacimiento;
    if (fields.categoria || fields.fechaNacimiento) {
      const categoria = await EscuelaCategoria.findOne({
        _id: categoryId, escuela, estado: "activa"
      });
      validCategory(categoria, birth);
    }
    Object.assign(jugador, fields);
    await jugador.save();
    return res.json({ jugador });
  } catch (error) { return fail(error, res, next); }
}
async function vincularApoderado(req, res, next) {
  try {
    const jugadorId = id(req.params.jugadorId);
    const apoderadoId = id(req.body?.apoderadoId);
    if (!req.body || Object.keys(req.body).length !== 1) {
      err("Solo se permite indicar apoderadoId");
    }
    const escuela = tenant(req);
    const [jugador, apoderado] = await Promise.all([
      EscuelaJugador.findOne({ _id: jugadorId, escuela }).select("_id"),
      EscuelaApoderado.findOne({
        _id: apoderadoId, escuela, estado: "activo"
      }).select("_id")
    ]);
    if (!jugador || !apoderado) {
      return res.status(404).json({ error: "Jugador o apoderado no encontrado" });
    }
    const vinculo = await Vinculo.findOneAndUpdate({
      escuela, jugador: jugador._id, apoderado: apoderado._id
    }, { $set: { estado: "activo" } }, {
      new: true, upsert: true, runValidators: true,
      setDefaultsOnInsert: true
    });
    return res.status(201).json({ vinculo });
  } catch (error) { return fail(error, res, next); }
}
module.exports = { apoderados, crearApoderado, listar, crear, actualizar, vincularApoderado };
