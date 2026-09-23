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
  $("agenda").replaceChildren();
  $("avisos").replaceChildren();
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
function emptyMessage(root, message) {
  const p = document.createElement("p"); p.textContent = message; root.append(p);
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("es-CL", {
    timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric"
  });
}
function renderAgenda(data) {
  $("agenda").replaceChildren();
  $("avisos").replaceChildren();
  for (const activity of data.proximasActividades) {
    const card = document.createElement("article");
    card.className = "familia-card";
    const heading = document.createElement("h3");
    heading.textContent = activity.tipoEvento + " · " +
      formatDate(activity.fechaEvento);
    const time = document.createElement("p");
    time.textContent = activity.horaInicio ?
      "Hora: " + activity.horaInicio : "Hora por confirmar";
    const players = document.createElement("small");
    players.textContent = "Para: " + activity.jugadores.join(", ");
    card.append(heading, time, players);
    const list = document.createElement("div");
    list.className = "confirmaciones";
    for (const confirmacion of activity.confirmaciones || []) {
      const row = document.createElement("div");
      row.className = "confirmacion-jugador";
      const name = document.createElement("strong");
      name.textContent = confirmacion.nombre;
      const status = document.createElement("span");
      const names = {
        pendiente: "Sin confirmar", asistira: "Asistirá",
        no_asistira: "No asistirá"
      };
      status.textContent = names[confirmacion.estado] || names.pendiente;
      status.className = "confirmacion-estado";
      const buttons = document.createElement("div");
      buttons.className = "confirmacion-botones";
      for (const [estado, label] of [
        ["asistira", "✓ Asistirá"],
        ["no_asistira", "✕ No asistirá"],
        ["pendiente", "Restablecer"]
      ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secundario";
        button.textContent = label;
        button.disabled = confirmacion.estado === estado;
        button.setAttribute("aria-label", label + ": " + confirmacion.nombre);
        button.addEventListener("click", async () => {
          buttons.querySelectorAll("button").forEach(b => { b.disabled = true; });
          try {
            await api("/" + encodeURIComponent($("escuela").value) +
              "/familia/eventos/" + encodeURIComponent(activity.id) +
              "/jugadores/" + encodeURIComponent(confirmacion.jugadorId) +
              "/confirmacion", "PATCH", { estado });
            await loadFamily();
            note("Participación prevista actualizada. La asistencia real se registra en cancha.");
          } catch (error) {
            note(error.message);
            buttons.querySelectorAll("button").forEach(b => { b.disabled = false; });
          }
        });
        buttons.append(button);
      }
      row.append(name, status, buttons);
      list.append(row);
    }
    card.append(list); $("agenda").append(card);
  }
  if (!data.proximasActividades.length) {
    emptyMessage($("agenda"), "Sin actividades próximas registradas.");
  }
  for (const aviso of data.avisos) {
    const card = document.createElement("article");
    card.className = "familia-card";
    const heading = document.createElement("h3");
    heading.textContent = aviso.titulo;
    const when = document.createElement("small");
    when.textContent = (aviso.alcance === "escuela" ?
      "Toda la escuela" : "Tu categoría") + " · " +
      formatDate(aviso.publicadoEn);
    const message = document.createElement("p");
    message.className = "aviso-mensaje"; message.textContent = aviso.mensaje;
    card.append(heading, when, message); $("avisos").append(card);
  }
  if (!data.avisos.length) emptyMessage($("avisos"), "Sin avisos publicados.");
}
async function loadFamily() {
  const id = $("escuela").value;
  $("jugadores").replaceChildren();
  $("contenido").hidden = !id;
  $("agenda").replaceChildren();
  $("avisos").replaceChildren();
  if (!id) return;
  const [data, agenda] = await Promise.all([
    api("/" + encodeURIComponent(id) + "/familia/mis-jugadores"),
    api("/" + encodeURIComponent(id) + "/familia/agenda")
  ]);
  if ($("escuela").value !== id) return;
  const primary = data.escuela.branding?.colorPrimario;
  document.documentElement.style.setProperty("--familia-color",
    /^#[a-f0-9]{6}$/i.test(primary || "") ? primary : "#176a50");
  $("titulo").textContent = data.escuela.branding?.nombrePublico ||
    data.escuela.nombre;
  const logo = data.escuela.branding?.logoUrl;
  const cover = data.escuela.branding?.portadaUrl;
  $("familiaLogo").hidden = !logo;
  $("familiaPortada").hidden = !cover;
  if (logo) $("familiaLogo").src = logo;
  else $("familiaLogo").removeAttribute("src");
  if (cover) $("familiaPortada").src = cover;
  else $("familiaPortada").removeAttribute("src");
  for (const player of data.jugadores) $("jugadores").append(card(player));
  renderAgenda(agenda);
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