(() => {
"use strict";
const MAX_FILE = 8 * 1024 * 1024;
const MAX_UPLOAD = 750 * 1024;
const mimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

async function obtenerBase64(file, tipo) {
  if (!file || !mimeTypes.has(file.type) || file.size > MAX_FILE) {
    throw new Error("Selecciona una imagen PNG, JPG o WebP de hasta 8 MB.");
  }
  if (!["logo", "portada"].includes(tipo)) throw new Error("Tipo de imagen inválido");
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight ||
        img.naturalWidth > 8000 || img.naturalHeight > 8000) {
      throw new Error("Dimensiones originales excesivas (máximo 8000 píxeles)");
    }
    const max = tipo === "logo" ? [1000, 1000] : [2000, 1400];
    const factor = Math.min(1, max[0] / img.naturalWidth,
      max[1] / img.naturalHeight);
    let width = Math.max(1, Math.floor(img.naturalWidth * factor));
    let height = Math.max(1, Math.floor(img.naturalHeight * factor));
    const mime = tipo === "logo" && file.type !== "image/jpeg" ?
      "image/png" : "image/jpeg";
    for (let intento = 0; intento < 5; intento++) {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar la imagen");
      if (mime === "image/jpeg") {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(img, 0, 0, width, height);
      const blob = await new Promise(resolve => canvas.toBlob(
        resolve, mime, mime === "image/jpeg" ? 0.82 - intento * 0.1 : undefined
      ));
      if (!blob) throw new Error("El navegador no pudo procesar la imagen");
      if (blob.size <= MAX_UPLOAD) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("No se pudo convertir la imagen"));
          reader.readAsDataURL(blob);
        });
        return String(dataUrl).split(",")[1];
      }
      width = Math.max(1, Math.floor(width * 0.75));
      height = Math.max(1, Math.floor(height * 0.75));
    }
    throw new Error("La imagen es demasiado grande. Prueba con una imagen más simple.");
  } finally { URL.revokeObjectURL(url); }
}
function mostrarImagen(imagen, mensaje, ruta, fallback) {
  const valido = typeof ruta === "string" &&
    /^\/uploads\/escuelas\/[0-9a-f]{24}\/(?:logo|portada)\/[0-9a-f]{24}\.(?:png|jpg)$/i.test(ruta);
  imagen.hidden = !valido;
  mensaje.hidden = valido;
  if (valido) imagen.src = ruta;
  else {
    imagen.removeAttribute("src");
    mensaje.textContent = fallback;
  }
}
window.escuelaImagenes = Object.freeze({ obtenerBase64, mostrarImagen });
})();