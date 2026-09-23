(() => {
"use strict";
const $ = id => document.getElementById(id);
const token = () => sessionStorage.getItem("schoolToken");
const note = message => { $("mensaje").textContent = message; };
function logout() {
  sessionStorage.removeItem("schoolToken");
  $("loginPanel").hidden = false; $("dashboard").hidden = true;
  $("contenido").hidden = true; $("salir").hidden = true;
  $("jugadores").replaceChildren();
}
async function api(path, method = "GET", data) {
  const response = await fetch("/api/escuela-sesion" + path, {
    method, headers: { "Content-Type": "application/json",
      ...(token() ? { Authorization: "Bearer " + token() } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) })
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) logout();
  if (!response.ok) throw new Error(body.error || "Error de conexión");
  return body;
}
function cell(row, text) {
  const td = row.insertCell(); td.textContent = text; return td;
}
function card(player) {
  const root = document.createElement("article");
  root.className = "familia-card";
  const title = document.createElement("h3"); title.textContent = player.nombre;
  const category = document.createElement("p");
  category.textContent = player.categoria ?
    player.categoria.nombre + " · " + player.categoria.modalidad :
    "Categoría por confirmar";
  const stats = document.createElement("div"); stats.className = "resumen-familia";
  stats.textContent = player.asistenciaReciente.porcentaje === null ?
    "Sin asistencia confirmada en las actividades recientes" :
    "Asistencia reciente: " + player.asistenciaReciente.porcentaje + "%";
  const table = document.createElement("table");
  const caption = document.createElement("caption");
  caption.textContent = "Últimas actividades cerradas";
  table.append(caption);
  const head = table.createTHead().insertRow();
  for (const col of ["Fecha", "Tipo", "Asistencia", "Goles"]) {
    const th = document.createElement("th"); th.textContent = col; head.append(th);
  }
  const body = table.createTBody();
  for (const event of player.ultimasActividades) {
    const row = body.insertRow();
    cell(row, new Date(event.fechaEvento).toLocaleDateString("es-CL", {
      timeZone: "UTC"
    }));
    cell(row, event.tipoEvento);
    cell(row, event.asistencia);
    cell(row, event.goles ?? "—");
  }
  const foot = document.createElement("small");
  foot.textContent = player.ultimasActividades.length ?
    "Resumen basado únicamente en actividades cerradas." :
    "Todavía no hay actividades cerradas para mostrar.";
  root.append(title, category, stats, table, foot);
  return root;
}
async function loadFamily() {
  const id = $("escuela").value;
  $("jugadores").replaceChildren();
  $("contenido").hidden = !id;
  if (!id) return;
  const data = await api("/" + encodeURIComponent(id) + "/familia/mis-jugadores");
  const primary = data.escuela.branding?.colorPrimario;
  document.documentElement.style.setProperty("--familia-color",
    /^#[a-f0-9]{6}$/i.test(primary || "") ? primary : "#176a50");
  $("titulo").textContent = data.escuela.branding?.nombrePublico ||
    data.escuela.nombre;
  for (const player of data.jugadores) $("jugadores").append(card(player));
  if (!data.jugadores.length) note("Aún no hay jugadores activos vinculados a esta cuenta.");
  else note("");
}
async function load() {
  const data = await api("/mis-escuelas");
  const select = $("escuela");
  select.replaceChildren(new Option("Selecciona una escuela", ""));
  for (const school of data.escuelas.filter(s => s.roles.includes("apoderado"))) {
    select.add(new Option(school.nombre, school.id));
  }
  $("loginPanel").hidden = true;
  $("dashboard").hidden = false;
  $("salir").hidden = false;
  if (select.options.length === 2) {
    select.selectedIndex = 1;
    await loadFamily();
  }
}
$("login").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter;
  button.disabled = true;
  try {
    const data = await api("/auth/login", "POST", {
      email: $("email").value.trim(), password: $("password").value
    });
    sessionStorage.setItem("schoolToken", data.token);
    $("password").value = "";
    await load(); note("Sesión iniciada");
  } catch (error) { note(error.message); }
  finally { button.disabled = false; }
});
$("escuela").addEventListener("change", () => loadFamily().catch(e => note(e.message)));
$("salir").addEventListener("click", () => { logout(); note("Sesión cerrada"); });
if (token()) load().catch(e => { logout(); note(e.message); });
})();