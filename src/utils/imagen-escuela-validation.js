// Formatos deliberadamente limitados a imágenes raster; nunca SVG/HTML.
const MAX_BYTES = 750 * 1024;
const MAX_DIMENSIONS = { logo: [1000, 1000], portada: [2000, 1400] };
function invalid(message) {
  const error = new Error(message); error.status = 400; throw error;
}
function jpegDimensions(bytes) {
  let offset = 2;
  while (offset < bytes.length - 9) {
    if (bytes[offset] !== 0xff) invalid("JPEG inválido");
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) invalid("JPEG incompleto");
    // SOF: dimensiones disponibles sin decodificar la imagen entera.
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 7) invalid("JPEG inválido");
      return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    }
    offset += length;
  }
  invalid("JPEG sin dimensiones válidas");
}
function revisarImagen(body, tipo) {
  if (!Object.hasOwn(MAX_DIMENSIONS, tipo)) invalid("Tipo de imagen inválido");
  if (!body || typeof body !== "object" || Array.isArray(body) ||
      Object.getPrototypeOf(body) !== Object.prototype ||
      Object.keys(body).length !== 1 || typeof body.base64 !== "string") {
    invalid("Solo se permite una imagen en formato base64");
  }
  const encoded = body.base64;
  if (!encoded || encoded.length > Math.ceil(MAX_BYTES / 3) * 4 + 4 ||
      encoded.length % 4 !== 0 ||
      !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(encoded)) {
    invalid("Archivo de imagen inválido o demasiado grande");
  }
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) {
    invalid("Imagen superior al máximo permitido (750 KB)");
  }
  let mime, ext, dimensions;
  if (bytes.length >= 24 &&
      bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) &&
      bytes.toString("ascii", 12, 16) === "IHDR") {
    mime = "image/png"; ext = "png";
    dimensions = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  } else if (bytes.length >= 16 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
             bytes[2] === 0xff) {
    mime = "image/jpeg"; ext = "jpg";
    dimensions = jpegDimensions(bytes);
  } else {
    invalid("Formato no admitido: selecciona PNG o JPEG");
  }
  const [w, h] = dimensions;
  const [maxW, maxH] = MAX_DIMENSIONS[tipo];
  if (!w || !h || w > maxW || h > maxH) {
    invalid("Dimensiones excedidas: " + maxW + " × " + maxH + " píxeles");
  }
  return { bytes, mime, ext, width: w, height: h };
}
module.exports = { revisarImagen, MAX_BYTES, MAX_DIMENSIONS };
