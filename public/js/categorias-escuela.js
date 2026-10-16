(() => {
"use strict";
const $ = id => document.getElementById(id);
const schoolId = new URLSearchParams(location.search).get("escuela");
const sessionToken = sessionStorage.getItem("schoolToken");
const URL_BASE = "/api/escuela-sesion/" + encodeURIComponent(schoolId || "");
let categorias = [], editId = null;
const notify = msg => { $("mensaje").textContent = msg; };

async function api(path, method = "GET", body) {
  const res = await fetch(URL_BASE + path, {
    method, headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + sessionToken
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let result;
  try { result = await res.json(); } catch { result = {}; }
  if (!res.ok) throw new Error(result.error || "Error HTTP " + res.status);
  return result;
}
function cell(row, text) {
  const td = row.insertCell();
  td.textContent = text;
  return td;
}
function reset() {
  editId = null;
  $("categoriaForm").reset();
  $("formTitulo").textContent = "Nueva categoría";
  $("guardar").textContent = "Guardar categoría";
  $("cancelar").hidden = true;
}
function edit(cat) {
  editId = cat._id;
  $("nombre").value = cat.nombre;
  $("modalidad").value = cat.modalidad;
  $("edadMin").value = cat.edadMin;
  $("edadMax").value = cat.edadMax;
  $("cupos").value = cat.cupos ?? "";
  $("formTitulo").textContent = "Editar categoría";
  $("guardar").textContent = "Guardar cambios";
  $("cancelar").hidden = false;
  $("categoriaForm").scrollIntoView({ behavior: "smooth", block: "center" });
}
async function load() {
  const result = await api("/categorias");
  categorias = result.categorias || [];
  $("tabla").replaceChildren();
  $("total").textContent = categorias.length;
  $("activas").textContent = categorias.filter(c => c.estado === "activa").length;
  $("inactivas").textContent = categorias.filter(c => c.estado === "inactiva").length;
  for (const cat of categorias) {
    const row = $("tabla").insertRow();
    cell(row, cat.nombre);
    cell(row, cat.modalidad === "formativo" ? "Formativo" : "Competitivo");
    cell(row, cat.edadMin + "–" + cat.edadMax + " años");
    cell(row, cat.cupos ?? "No definido");
    const badge = document.createElement("span");
    badge.className = "pildora " + (cat.estado === "inactiva" ? "inactiva" : "");
    badge.textContent = cat.estado;
    cell(row, "").append(badge);
    const actions = row.insertCell();
    const modify = document.createElement("button");
    modify.type = "button"; modify.className = "secundario";
    modify.textContent = "Editar"; modify.addEventListener("click", () => edit(cat));
    actions.append(modify);
    const state = document.createElement("button");
    state.type = "button";
    state.textContent = cat.estado === "activa" ? "Desactivar" : "Activar";
    state.addEventListener("click", async () => {
      const desired = cat.estado === "activa" ? "inactiva" : "activa";
      if (!confirm("¿Cambiar estado de " + cat.nombre + " a " + desired + "?")) return;
      state.disabled = true;
      try {
        await api("/categorias/" + cat._id, "PATCH", { estado: desired });
        if (editId === cat._id) reset();
        await load();
        notify("Estado actualizado");
      } catch (error) { notify(error.message); state.disabled = false; }
    });
    actions.append(state);
  }
}
$("categoriaForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  const data = {
    nombre: $("nombre").value.trim(), modalidad: $("modalidad").value,
    edadMin: Number($("edadMin").value), edadMax: Number($("edadMax").value),
    cupos: $("cupos").value === "" ? null : Number($("cupos").value)
  };
  try {
    await api(editId ? "/categorias/" + editId : "/categorias",
      editId ? "PATCH" : "POST", data);
    reset();
    await load();
    notify("Categoría guardada correctamente");
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
$("cancelar").addEventListener("click", reset);
(async () => {
  if (!schoolId || !/^[0-9a-f]{24}$/i.test(schoolId) || !sessionToken) {
    notify("Acceso no disponible. Inicia sesión y selecciona tu escuela.");
    $("categoriaForm").hidden = true;
    return;
  }
  try {
    const { escuela } = await api("/director");
    $("titulo").textContent = "Categorías · " + (escuela.branding?.nombrePublico || escuela.nombre);
    await load();
  } catch (error) {
    notify(error.message);
    $("categoriaForm").hidden = true;
  }
})();
})();
