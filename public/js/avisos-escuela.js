(() => {
"use strict";
const $ = id => document.getElementById(id);
const escuelaId = new URLSearchParams(location.search).get("escuela");
const token = sessionStorage.getItem("schoolToken");
const root = "/api/escuela-sesion/" + encodeURIComponent(escuelaId || "");
const note = msg => { $("mensaje").textContent = msg; };
let categorias = [];

async function api(path, method = "GET", payload) {
  const res = await fetch(root + path, {
    method, headers: {
      "Content-Type": "application/json", Authorization: "Bearer " + token
    }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Error " + res.status);
  return body;
}
function action(text, callback) {
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "secundario";
  btn.textContent = text; btn.addEventListener("click", callback);
  return btn;
}
async function refresh() {
  const data = await api("/avisos");
  $("listado").replaceChildren();
  if (!data.avisos.length) {
    const p = document.createElement("p"); p.textContent = "No hay avisos todavía.";
    $("listado").append(p);
  }
  for (const aviso of data.avisos) {
    const article = document.createElement("article");
    article.className = "panel";
    const heading = document.createElement("h3");
    heading.textContent = aviso.titulo;
    const category = categorias.find(c => String(c._id) === String(aviso.categoria));
    const info = document.createElement("p");
    info.textContent = (aviso.categoria ?
      (category ? category.nombre + " · " + category.modalidad : "Categoría histórica") :
      "Toda la escuela") + " · " + aviso.estado;
    const text = document.createElement("p");
    text.textContent = aviso.mensaje;
    article.append(heading, info, text);
    if (aviso.estado !== "archivado") {
      const next = aviso.estado === "borrador" ? "publicado" : "archivado";
      const button = action(next === "publicado" ? "Publicar" : "Archivar", async () => {
        if (!confirm("¿" + (next === "publicado" ? "Publicar" : "Archivar") +
          " este aviso?")) return;
        button.disabled = true;
        try {
          await api("/avisos/" + aviso._id + "/estado", "PATCH", { estado: next });
          await refresh(); note("Estado de aviso actualizado");
        } catch (error) { note(error.message); button.disabled = false; }
      });
      article.append(button);
    }
    $("listado").append(article);
  }
}
$("formulario").addEventListener("submit", async e => {
  e.preventDefault();
  const button = e.submitter; button.disabled = true;
  try {
    await api("/avisos", "POST", {
      titulo: $("asunto").value.trim(),
      mensaje: $("texto").value.trim(),
      categoriaId: $("categoria").value || null,
      publicar: $("publicar").checked
    });
    $("formulario").reset();
    await refresh();
    note("Aviso guardado correctamente");
  } catch (error) { note(error.message); }
  finally { button.disabled = false; }
});
(async () => {
  if (!/^[a-f0-9]{24}$/i.test(escuelaId || "") || !token) {
    note("Inicia sesión como director y selecciona tu escuela.");
    $("formulario").hidden = true; return;
  }
  try {
    const [school, categoryData] = await Promise.all([
      api("/director"), api("/categorias")
    ]);
    $("titulo").textContent = "Avisos · " +
      (school.escuela.branding?.nombrePublico || school.escuela.nombre);
    categorias = categoryData.categorias;
    $("categoria").replaceChildren(new Option("Toda la escuela", ""));
    for (const c of categorias.filter(c => c.estado === "activa")) {
      $("categoria").add(new Option(c.nombre + " · " + c.modalidad, c._id));
    }
    await refresh();
  } catch (error) { note(error.message); $("formulario").hidden = true; }
})();
})();