(() => {
"use strict";
const $ = name => document.getElementById(name);
const escuela = new URLSearchParams(location.search).get("escuela");
const token = sessionStorage.getItem("schoolToken");
const base = "/api/escuela-sesion/" + encodeURIComponent(escuela || "");
let jugadores = [], apoderados = [], categorias = [], editing = null;
function note(message) { $("mensaje").textContent = message; }
async function api(path, method = "GET", data) {
  const response = await fetch(base + path, {
    method, headers: {
      "Content-Type": "application/json", Authorization: "Bearer " + token
    }, ...(data === undefined ? {} : { body: JSON.stringify(data) })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Error " + response.status);
  return body;
}
function addCell(row, value) {
  const cell = row.insertCell();
  cell.textContent = value;
  return cell;
}
function options(select, entries, placeholder, label) {
  select.replaceChildren(new Option(placeholder, ""));
  for (const entry of entries) select.add(new Option(label(entry), entry._id));
}
function birthField(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}
function reset() {
  editing = null; $("jugadorForm").reset();
  $("formTitulo").textContent = "Registrar jugador";
  $("guardar").textContent = "Registrar jugador";
  $("labelApoderado").hidden = false;
  $("apoderado").required = true;
  $("cancelar").hidden = true;
}
function edit(jugador) {
  editing = jugador._id;
  $("nombreJugador").value = jugador.nombre;
  $("rutJugador").value = jugador.rut;
  $("nacimiento").value = birthField(jugador.fechaNacimiento);
  $("categoria").value = jugador.categoria?._id || "";
  $("labelApoderado").hidden = true;
  $("apoderado").required = false;
  $("formTitulo").textContent = "Editar jugador";
  $("guardar").textContent = "Guardar cambios";
  $("cancelar").hidden = false;
  $("jugadorForm").scrollIntoView({ behavior: "smooth", block: "center" });
}
async function refresh() {
  const [players, guardians, categories] = await Promise.all([
    api("/jugadores"), api("/apoderados"), api("/categorias")
  ]);
  jugadores = players.jugadores || [];
  apoderados = guardians.apoderados || [];
  categorias = categories.categorias || [];
  options($("categoria"), categorias.filter(c => c.estado === "activa"),
    "Selecciona categoría", c => c.nombre + " · " + c.modalidad);
  options($("apoderado"), apoderados.filter(a => a.estado === "activo"),
    "Selecciona apoderado", a => a.nombre + " (" + a.rut + ")");
  $("tablaApoderados").replaceChildren();
  for (const guardian of apoderados) {
    const row = $("tablaApoderados").insertRow();
    addCell(row, guardian.nombre);
    addCell(row, guardian.email);
    addCell(row, guardian.estado);
    const actions = row.insertCell();
    const button = document.createElement("button");
    button.className = "secundario";
    button.type = "button";
    button.textContent = guardian.usuario ? "Cuenta vinculada" :
      "Invitar acceso familiar";
    button.disabled = guardian.estado !== "activo" || Boolean(guardian.usuario);
    button.addEventListener("click", async () => {
      if (!confirm("¿Enviar una invitación al correo registrado de " +
        guardian.nombre + "?")) return;
      button.disabled = true;
      try {
        await api("/apoderados/" + guardian._id + "/invitar", "POST", {});
        note("Invitación enviada. El acceso se activa desde el correo del apoderado.");
      } catch (error) { note(error.message); button.disabled = false; }
    });
    actions.append(button);
  }
  $("total").textContent = jugadores.length;
  $("activos").textContent = jugadores.filter(j => j.estado === "activo").length;
  $("inactivos").textContent = jugadores.filter(j => j.estado === "inactivo").length;
  $("tabla").replaceChildren();
  for (const jugador of jugadores) {
    const row = $("tabla").insertRow();
    addCell(row, jugador.nombre);
    addCell(row, jugador.rut);
    addCell(row, jugador.categoria ?
      jugador.categoria.nombre + " · " + jugador.categoria.modalidad : "Sin categoría activa");
    const guardianCell = row.insertCell();
    guardianCell.textContent = jugador.apoderados.map(a => a.nombre).join(", ") || "Sin vínculo activo";
    const state = document.createElement("span");
    state.className = "pildora " + (jugador.estado === "inactivo" ? "inactiva" : "");
    state.textContent = jugador.estado;
    row.insertCell().append(state);
    const actions = row.insertCell();
    const modify = document.createElement("button");
    modify.type = "button"; modify.className = "secundario";
    modify.textContent = "Editar"; modify.addEventListener("click", () => edit(jugador));
    actions.append(modify);
    const toggle = document.createElement("button");
    toggle.type = "button"; toggle.textContent = jugador.estado === "activo" ?
      "Desactivar" : "Activar";
    toggle.addEventListener("click", async () => {
      if (!confirm("¿Cambiar estado de " + jugador.nombre + "?")) return;
      toggle.disabled = true;
      try {
        await api("/jugadores/" + jugador._id, "PATCH", {
          estado: jugador.estado === "activo" ? "inactivo" : "activo"
        });
        reset(); await refresh(); note("Estado actualizado");
      } catch (error) { note(error.message); toggle.disabled = false; }
    });
    actions.append(toggle);
    const link = document.createElement("button");
    link.type = "button"; link.className = "secundario";
    link.textContent = "Vincular apoderado";
    link.addEventListener("click", async () => {
      const current = $("apoderado").value;
      if (!current) return note("Selecciona primero un apoderado en el formulario.");
      if (!confirm("¿Vincular el apoderado seleccionado con " + jugador.nombre + "?")) return;
      link.disabled = true;
      try {
        await api("/jugadores/" + jugador._id + "/apoderados", "POST",
          { apoderadoId: current });
        await refresh(); note("Apoderado vinculado");
      } catch (error) { note(error.message); link.disabled = false; }
    });
    actions.append(link);
  }
}
$("apoderadoForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const result = await api("/apoderados", "POST", {
      nombre: $("nombreApoderado").value.trim(),
      rut: $("rutApoderado").value.trim(),
      email: $("emailApoderado").value.trim(),
      telefono: $("telefonoApoderado").value.trim() || null
    });
    $("apoderadoForm").reset();
    await refresh();
    $("apoderado").value = result.apoderado._id;
    note("Apoderado registrado; ya puedes registrar el jugador.");
  } catch (error) { note(error.message); }
  finally { button.disabled = false; }
});
$("jugadorForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const body = {
      nombre: $("nombreJugador").value.trim(),
      rut: $("rutJugador").value.trim(),
      fechaNacimiento: $("nacimiento").value,
      categoriaId: $("categoria").value
    };
    if (!editing) body.apoderadoId = $("apoderado").value;
    await api(editing ? "/jugadores/" + editing : "/jugadores",
      editing ? "PATCH" : "POST", body);
    reset(); await refresh(); note("Jugador guardado correctamente");
  } catch (error) { note(error.message); }
  finally { button.disabled = false; }
});
$("cancelar").addEventListener("click", reset);
(async () => {
  if (!escuela || !/^[0-9a-f]{24}$/i.test(escuela) || !token) {
    note("Inicia sesión y selecciona una escuela.");
    $("jugadorForm").hidden = true;
    $("apoderadoForm").hidden = true;
    return;
  }
  try {
    const result = await api("/director");
    $("titulo").textContent = "Jugadores · " +
      (result.escuela.branding?.nombrePublico || result.escuela.nombre);
    await refresh();
  } catch (error) {
    note(error.message);
    $("jugadorForm").hidden = true;
    $("apoderadoForm").hidden = true;
  }
})();
})();
