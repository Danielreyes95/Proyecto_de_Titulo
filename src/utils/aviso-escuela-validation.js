function error(message) {
  const e = new Error(message); e.status = 400; throw e;
}

function validarAviso(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.getPrototypeOf(body) !== Object.prototype ||
      Object.keys(body).some(key =>
        !["titulo", "mensaje", "categoriaId", "publicar"].includes(key))) {
    error("Solicitud con campos no permitidos");
  }
  if (typeof body.titulo !== "string" || !body.titulo.trim() ||
      body.titulo.trim().length > 120) error("Título inválido");
  if (typeof body.mensaje !== "string" || !body.mensaje.trim() ||
      body.mensaje.trim().length > 1000) error("Mensaje inválido");
  let categoriaId = null;
  if (body.categoriaId !== undefined && body.categoriaId !== null &&
      body.categoriaId !== "") {
    if (typeof body.categoriaId !== "string" ||
        !/^[a-f0-9]{24}$/i.test(body.categoriaId)) error("Categoría inválida");
    categoriaId = body.categoriaId;
  }
  if (body.publicar !== undefined && typeof body.publicar !== "boolean") {
    error("Estado de publicación inválido");
  }
  return {
    titulo: body.titulo.trim(), mensaje: body.mensaje.trim(), categoriaId,
    publicar: body.publicar === true
  };
}

module.exports = { validarAviso };
