const test = require("node:test");
const assert = require("node:assert/strict");
const { revisarImagen } = require("../src/utils/imagen-escuela-validation");
const { validateBranding } = require("../src/utils/escuela-validation");

function png(width, height) {
  const data = Buffer.alloc(28);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(data);
  data.writeUInt32BE(13, 8);
  data.write("IHDR", 12, "ascii");
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  return { base64: data.toString("base64") };
}
function jpg(width, height) {
  // Cabecera JPEG mínima para comprobar la lectura de metadatos SOF.
  const data = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 255, height & 255,
    (width >>> 8) & 255, width & 255,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x00,
    0x03, 0x11, 0x00, 0xff, 0xd9
  ]);
  return { base64: data.toString("base64") };
}
test("logo PNG y portada JPEG verificados por firma y dimensiones", () => {
  const logo = revisarImagen(png(600, 600), "logo");
  assert.equal(logo.mime, "image/png");
  assert.deepEqual([logo.width, logo.height], [600, 600]);
  const cover = revisarImagen(jpg(1600, 900), "portada");
  assert.equal(cover.mime, "image/jpeg");
  assert.equal(cover.ext, "jpg");
  assert.deepEqual([cover.width, cover.height], [1600, 900]);
});
test("no confía en extensión, SVG, HTML o data URL suministrada", () => {
  for (const raw of ['<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    '<html><script>alert(1)</script></html>']) {
    assert.throws(() => revisarImagen({
      base64: Buffer.from(raw).toString("base64")
    }, "logo"), /Formato no admitido/);
  }
  assert.throws(() => revisarImagen({
    base64: "data:image/png;base64," + png(32, 32).base64
  }, "logo"), /Archivo de imagen inválido/);
});
test("límites de dimensiones para cada función y tamaño", () => {
  assert.throws(() => revisarImagen(png(1800, 900), "logo"),
    /Dimensiones excedidas/);
  assert.doesNotThrow(() => revisarImagen(png(1800, 900), "portada"));
  assert.throws(() => revisarImagen(png(0, 0), "portada"),
    /Dimensiones excedidas/);
  assert.throws(() => revisarImagen({
    base64: Buffer.alloc(750 * 1024 + 1).toString("base64")
  }, "portada"), /demasiado grande|máximo/);
});
test("no admite escuela ni contenido arbitrario en petición de imagen", () => {
  assert.throws(() => revisarImagen({
    ...png(300, 300), escuelaId: "507f1f77bcf86cd799439011"
  }, "logo"), /Solo se permite/);
  assert.throws(() => revisarImagen(png(300, 300), "__proto__"),
    /Tipo de imagen inválido/);
});
test("ningún usuario puede escribir logoUrl o portadaUrl directamente en branding", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.throws(() => validateBranding({
    logoUrl: "/uploads/escuelas/" + id + "/logo/foto.png"
  }, id), /Ruta de imagen inválida/);
  assert.throws(() => validateBranding({
    portadaUrl: null
  }, id), /Ruta de imagen inválida/);
});
