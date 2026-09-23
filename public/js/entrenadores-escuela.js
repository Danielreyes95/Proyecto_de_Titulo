(() => {
"use strict";
const $ = id => document.getElementById(id);
const schoolId = new URLSearchParams(location.search).get("escuela");
const token = sessionStorage.getItem("schoolToken");
const root = "/api/escuela-sesion/" + encodeURIComponent(schoolId || "");
let entrenadores = [], categorias = [], editId = null;
const notify = message => { $("mensaje").textContent = message; };

async function api(path, method = "GET", data) {
  const r = await fetch(root + path, {
    method, headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    }, ...(data === undefined ? {} : { body: JSON.stringify(data) })
  });
  let result;
  try { result = await r.json(); } catch { result = {}; }
  if (!r.ok) throw new Error(result.error || "Error HTTP " + r.status);
  return result;
}
function textCell(row, value) {
  const cell = row.insertCell();
  cell.textContent = value;
  return cell;
}
function cancelEdit() {
  editId = null;
  $("entrenadorForm").reset();
  $("formTitulo").textContent = "Registrar entrenador";
  $("guardar").textContent = "Guardar entrenador";
  $("cancelar").hidden = true;
}
function edit(entrenador) {
  editId = entrenador._id;
  $("nombre").value = entrenador.nombre;
  $("email").value = entrenador.email;
  $("formTitulo").textContent = "Editar entrenador";
  $("guardar").textContent = "Guardar cambios";
  $("cancelar").hidden = false;
  $("entrenadorForm").scrollIntoView({ behavior: "smooth", block: "center" });
}
async function refresh() {
  const [people, categories] = await Promise.all([
    api("/entrenadores"), api("/categorias")
  ]);
  entrenadores = people.entrenadores || [];
  categorias = categories.categorias || [];
  $("total").textContent = entrenadores.length;
  $("activos").textContent = entrenadores.filter(x => x.estado === "activo").length;
  $("inactivos").textContent = entrenadores.filter(x => x.estado === "inactivo").length;
  const assignedIds = new Set(entrenadores.flatMap(person =>
    person.categorias.map(cat => String(cat._id))
  ));
  $("entrenadorId").replaceChildren(new Option("Seleccionar entrenador", ""));
  $("categoriaId").replaceChildren(new Option("Seleccionar categoría", ""));
  for (const person of entrenadores.filter(x => x.estado === "activo")) {
    $("entrenadorId").add(new Option(person.nombre, person._id));
  }
  for (const cat of categorias.filter(x =>
    x.estado === "activa" && !assignedIds.has(String(x._id))
  )) {
    $("categoriaId").add(new Option(cat.nombre + " · " + cat.modalidad, cat._id));
  }
  $("tabla").replaceChildren();
  for (const person of entrenadores) {
    const row = $("tabla").insertRow();
    textCell(row, person.nombre);
    textCell(row, person.email);
    const tags = row.insertCell();
    if (!person.categorias.length) tags.textContent = "Sin categoría";
    for (const cat of person.categorias) {
      const div = document.createElement("div");
      div.textContent = cat.nombre + " · " + cat.modalidad + " ";
      const finish = document.createElement("button");
      finish.type = "button"; finish.className = "secundario";
      finish.textContent = "Finalizar";
      finish.addEventListener("click", async () => {
        if (!confirm("¿Finalizar esta asignación?")) return;
        finish.disabled = true;
        try {
          await api("/entrenadores/" + person._id + "/asignaciones/" +
            cat._id + "/finalizar", "PATCH", {});
          await refresh();
          notify("Asignación finalizada");
        } catch (error) { notify(error.message); finish.disabled = false; }
      });
      div.append(finish);
      tags.append(div);
    }
    const badge = document.createElement("span");
    badge.className = "pildora " + (person.estado === "inactivo" ? "inactiva" : "");
    badge.textContent = person.estado;
    row.insertCell().append(badge);
    const actions = row.insertCell();
    const modify = document.createElement("button");
    modify.type = "button"; modify.className = "secundario";
    modify.textContent = "Editar"; modify.addEventListener("click", () => edit(person));
    actions.append(modify);
    const state = document.createElement("button");
    state.type = "button";
    state.textContent = person.estado === "activo" ? "Desactivar" : "Activar";
    state.addEventListener("click", async () => {
      if (!confirm("¿Cambiar el estado de " + person.nombre + "?")) return;
      state.disabled = true;
      try {
        await api("/entrenadores/" + person._id, "PATCH",
          { estado: person.estado === "activo" ? "inactivo" : "activo" });
        if (editId === person._id) cancelEdit();
        await refresh();
        notify("Estado actualizado");
      } catch (error) { notify(error.message); state.disabled = false; }
    });
    actions.append(state);
  }
}
$("entrenadorForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    await api(editId ? "/entrenadores/" + editId : "/entrenadores",
      editId ? "PATCH" : "POST", {
        nombre: $("nombre").value.trim(), email: $("email").value.trim()
      });
    cancelEdit(); await refresh(); notify("Entrenador guardado");
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
$("asignacionForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    await api("/entrenadores/" + $("entrenadorId").value + "/asignaciones",
      "POST", { categoriaId: $("categoriaId").value });
    await refresh(); notify("Entrenador asignado a la categoría");
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
$("cancelar").addEventListener("click", cancelEdit);
(async () => {
  if (!schoolId || !/^[0-9a-f]{24}$/i.test(schoolId) || !token) {
    notify("Inicia sesión y selecciona una escuela.");
    $("entrenadorForm").hidden = true;
    $("asignacionForm").hidden = true;
    return;
  }
  try {
    const { escuela } = await api("/director");
    $("titulo").textContent = "Entrenadores · " +
      (escuela.branding?.nombrePublico || escuela.nombre);
    await refresh();
  } catch (error) {
    notify(error.message);
    $("entrenadorForm").hidden = true;
    $("asignacionForm").hidden = true;
  }
})();
})();
