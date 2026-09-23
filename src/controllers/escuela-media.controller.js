const mongoose = require("mongoose");
const { finished } = require("node:stream/promises");
const Escuela = require("../models/escuela.model");
const { revisarImagen } = require("../utils/imagen-escuela-validation");

const key = { logo: "logoUrl", portada: "portadaUrl" };
const bucket = () => new mongoose.mongo.GridFSBucket(
  mongoose.connection.db, { bucketName: "escuela_brand_assets" }
);
function invalid(res, error, next) {
  if (error.status === 400) return res.status(400).json({ error: error.message });
  return next(error);
}
function actorId(req) {
  return req.params.escuelaId || req.params.id;
}
function imageId(url) {
  const matched = typeof url === "string" &&
    /\/([0-9a-f]{24})\.(?:png|jpg)$/i.exec(url);
  return matched ? new mongoose.Types.ObjectId(matched[1]) : null;
}
async function cargar(req, res, next) {
  let stream;
  let fileId;
  try {
    const tipo = req.params.tipo;
    const mediaKey = key[tipo];
    if (!mediaKey || !mongoose.isValidObjectId(actorId(req))) {
      return res.status(400).json({ error: "Imagen o escuela inválida" });
    }
    const image = revisarImagen(req.body, tipo);
    const escuelaId = actorId(req);
    const actual = await Escuela.findOne({
      _id: escuelaId, estado: "activa"
    }).select("branding");
    if (!actual) return res.status(404).json({ error: "Escuela no encontrada" });

    // Guardar en GridFS evita depender del disco efímero de un hosting.
    stream = bucket().openUploadStream(
      tipo + "." + image.ext,
      { contentType: image.mime, metadata: {
        escuelaId: String(actual._id), tipo,
        width: image.width, height: image.height
      } }
    );
    fileId = stream.id;
    stream.end(image.bytes);
    await finished(stream);
    const url = "/uploads/escuelas/" + String(actual._id) + "/" +
      tipo + "/" + String(fileId) + "." + image.ext;
    const filter = {
      _id: actual._id, estado: "activa",
      ["branding." + mediaKey]: actual.branding?.[mediaKey] || null
    };
    const updated = await Escuela.findOneAndUpdate(filter,
      { $set: { ["branding." + mediaKey]: url } },
      { new: true, runValidators: true }
    ).select("nombre slug branding");
    if (!updated) {
      await bucket().delete(fileId).catch(() => {});
      return res.status(409).json({
        error: "La imagen cambió en otra sesión. Actualiza y vuelve a subir."
      });
    }
    const oldId = imageId(actual.branding?.[mediaKey]);
    if (oldId) await bucket().delete(oldId).catch(() => {});
    return res.json({ escuela: updated, imagen: { tipo, url } });
  } catch (error) {
    if (fileId) await bucket().delete(fileId).catch(() => {});
    return invalid(res, error, next);
  }
}
async function quitar(req, res, next) {
  try {
    const mediaKey = key[req.params.tipo];
    if (!mediaKey || !mongoose.isValidObjectId(actorId(req))) {
      return res.status(400).json({ error: "Imagen o escuela inválida" });
    }
    const actual = await Escuela.findOne({
      _id: actorId(req), estado: "activa"
    }).select("branding");
    if (!actual) return res.status(404).json({ error: "Escuela no encontrada" });
    const oldUrl = actual.branding?.[mediaKey] || null;
    if (!oldUrl) return res.json({ mensaje: "Imagen ya eliminada" });
    const updated = await Escuela.findOneAndUpdate({
      _id: actual._id, estado: "activa",
      ["branding." + mediaKey]: oldUrl
    }, { $set: { ["branding." + mediaKey]: null } },
    { new: true, runValidators: true }).select("nombre slug branding");
    if (!updated) return res.status(409).json({
      error: "La imagen cambió en otra sesión. Actualiza."
    });
    const oldId = imageId(oldUrl);
    if (oldId) await bucket().delete(oldId).catch(() => {});
    return res.json({ escuela: updated, mensaje: "Imagen retirada" });
  } catch (error) { return next(error); }
}
async function obtenerPublica(req, res, next) {
  try {
    const tipo = req.params.tipo, mediaKey = key[tipo];
    const match = /^([0-9a-f]{24})\.(png|jpg)$/i.exec(req.params.archivo || "");
    if (!mediaKey || !match ||
        !mongoose.isValidObjectId(req.params.escuelaId)) {
      return res.status(404).end();
    }
    // Solo la imagen VIGENTE de una escuela ACTIVA tiene URL pública.
    const url = req.path;
    const school = await Escuela.exists({
      _id: req.params.escuelaId, estado: "activa",
      ["branding." + mediaKey]: url
    });
    if (!school) return res.status(404).end();
    const id = new mongoose.Types.ObjectId(match[1]);
    const file = await bucket().find({
      _id: id,
      "metadata.escuelaId": req.params.escuelaId,
      "metadata.tipo": tipo
    }).next();
    if (!file) return res.status(404).end();
    const mime = match[2] === "png" ? "image/png" : "image/jpeg";
    if (file.contentType !== mime || file.length > 750 * 1024) {
      return res.status(404).end();
    }
    res.set({
      "Content-Type": mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "no-store"
    });
    const download = bucket().openDownloadStream(id);
    download.on("error", err => {
      if (!res.headersSent) next(err);
      else res.destroy(err);
    });
    download.pipe(res);
  } catch (error) { return next(error); }
}
module.exports = { cargar, quitar, obtenerPublica };
