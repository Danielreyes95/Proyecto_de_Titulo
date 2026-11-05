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
  $("editorEntrenador").open = false;
}
function edit(entrenador) {
  editId = entrenador._id;
  $("nombre").value = entrenador.nombre;
  $("email").value = entrenador.email;
  $("formTitulo").textContent = "Editar entrenador";
  $("guardar").textContent = "Guardar cambios";
  $("cancelar").hidden = false;
  $("editorEntrenador").open = true;
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
  const cards = $("entrenadoresCards");
  cards.replaceChildren();
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
    if (person.estado === "activo") {
      const invite = document.createElement("button");
      invite.type = "button"; invite.className = "secundario";
      invite.textContent = "Invitar acceso";
      invite.addEventListener("click", async () => {
        if (!confirm("¿Enviar invitación de acceso a " + person.email + "?")) return;
        invite.disabled = true;
        try {
          await api("/entrenadores/" + person._id + "/invitar", "POST", {});
          notify("Invitación enviada. El entrenador recibirá un enlace válido 24 horas.");
        } catch (error) { notify(error.message); }
        finally { invite.disabled = false; }
      });
      actions.append(invite);
    }
    const card = document.createElement("article");
    card.className = "coach-card";
    const head = document.createElement("div");
    head.className = "coach-card-head";
    const avatar = document.createElement("span");
    avatar.className = "coach-avatar";
    avatar.textContent = person.nombre.slice(0, 1).toUpperCase();
    avatar.setAttribute("aria-hidden", "true");
    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = person.nombre;
    const email = document.createElement("small");
    email.textContent = person.email;
    details.append(title, email);
    head.append(avatar, details);
    const assigned = document.createElement("div");
    assigned.className = "coach-tags";
    if (!person.categorias.length) {
      const none = document.createElement("span");
      none.textContent = "Sin categoría asignada";
      assigned.append(none);
    }
    for (const cat of person.categorias) {
      const tag = document.createElement("span");
      tag.className = "coach-category-tag";
      tag.textContent = cat.nombre;
      assigned.append(tag);
    }
    const footer = document.createElement("div");
    footer.className = "coach-card-footer";
    const status = document.createElement("span");
    status.className = "pildora " + (person.estado === "inactivo" ? "inactiva" : "");
    status.textContent = person.estado;
    const editCard = document.createElement("button");
    editCard.type = "button";
    editCard.className = "secundario";
    editCard.textContent = "Editar";
    editCard.addEventListener("click", () => edit(person));
    const inviteCard = document.createElement("button");
    inviteCard.type = "button";
    inviteCard.textContent = "Invitar acceso";
    inviteCard.disabled = person.estado !== "activo";
    inviteCard.addEventListener("click", () => {
      const original = Array.from(actions.querySelectorAll("button"))
        .find(b => b.textContent === "Invitar acceso");
      original?.click();
    });
    footer.append(status, editCard, inviteCard);
    card.append(head, assigned, footer);
    cards.append(card);
  }
  if (!entrenadores.length) {
    const empty = document.createElement("div");
    empty.className = "empty-feature";
    empty.textContent = "Aún no hay entrenadores. Agrega a tu primer integrante del cuerpo técnico.";
    cards.append(empty);
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
$("nuevoEntrenador").addEventListener("click", () => {
  cancelEdit();
  $("editorEntrenador").open = true;
  $("nombre").focus();
});
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
