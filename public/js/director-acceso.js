(() => {
"use strict";
const $ = id => document.getElementById(id);
const BASE = "/api/escuela-sesion";
const params = new URLSearchParams(location.search);
const validId = value => /^[0-9a-f]{24}$/i.test(value || "");
let selectedSchool = null;
let selectedRole = null;
let selectedDetail = null;
let selectionVersion = 0;
const token = () => sessionStorage.getItem("schoolToken");
const notify = (text, error = false) => {
  $("mensaje").textContent = text;
  $("mensaje").classList.toggle("error", error);
};
const schoolName = school => school?.branding?.nombrePublico || school?.nombre || "Mi escuela";
const esc = encodeURIComponent;
function url(id, page) { return "/" + page + ".html?escuela=" + esc(id); }

async function api(path, data, method = "POST") {
  const response = await fetch(BASE + path, {
    method: data === undefined ? "GET" : method,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: "Bearer " + token() } : {})
    },
    cache: "no-store",
    ...(data === undefined ? {} : { body: JSON.stringify(data) })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Error HTTP " + response.status);
  return body;
}
function logout() {
  selectionVersion++;
  selectedSchool = null;
  selectedRole = null;
  selectedDetail = null;
  sessionStorage.removeItem("schoolToken");
  $("loginPanel").hidden = false;
  $("dashboard").hidden = true;
  $("salir").hidden = true;
  $("seleccion").hidden = true;
  $("panelPersonalizacion").hidden = true;
  $("panelPersonalizacion").open = false;
  $("selectorEscuelas").hidden = false;
  document.body.classList.remove("selected-school");
  window.UIPropuesta2?.clearShell();
}
function text(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined) el.textContent = content;
  return el;
}
function renderStats(items) {
  const root = $("resumenDirector");
  root.replaceChildren();
  for (const [label, count, iconName, hint] of items) {
    const card = text("article", "stat dashboard-metric");
    const symbol = text("span", "dashboard-metric-icon", iconName);
    symbol.setAttribute("aria-hidden", "true");
    card.append(symbol, text("strong", "dashboard-metric-value", String(count)),
      text("span", "dashboard-metric-label", label),
      text("small", "dashboard-metric-hint", hint));
    root.append(card);
  }
}
function renderAgenda(events, categories) {
  const root = $("proximasDirector");
  root.replaceChildren();
  const today = new Date().toISOString().slice(0, 10);
  const categoryNames = new Map((categories || []).map(c => [String(c._id), c.nombre]));
  const upcoming = (events || [])
    .filter(e => !e.cerrado && String(e.fechaEvento).slice(0, 10) >= today)
    .sort((a, b) => String(a.fechaEvento).localeCompare(String(b.fechaEvento)) ||
      String(a.horaInicio || "").localeCompare(String(b.horaInicio || "")))
    .slice(0, 5);
  if (!upcoming.length) {
    const empty = text("div", "empty-feature");
    empty.append(text("span", "empty-feature-icon", "▦"),
      text("strong", "", "No hay actividades próximas"),
      text("p", "", "Los próximos entrenamientos y partidos aparecerán aquí."));
    root.append(empty);
    return;
  }
  for (const item of upcoming) {
    const row = document.createElement("a");
    row.className = "director-agenda-item";
    row.href = url(selectedSchool, "registro-rapido") + "&evento=" + esc(String(item._id));
    const icon = text("span", "director-agenda-symbol", item.tipoEvento === "Partido" ? "⚽" : "▣");
    const copy = text("span", "director-agenda-info");
    copy.append(text("strong", "", item.tipoEvento + " · " +
      (categoryNames.get(String(item.categoria)) || "Categoría")),
      text("small", "", new Date(item.fechaEvento).toLocaleDateString("es-CL", {
        timeZone: "UTC", day: "2-digit", month: "long"
      }) + (item.horaInicio ? " · " + item.horaInicio : " · Hora por confirmar")));
    row.append(icon, copy, text("span", "tag-state", "Programado"));
    root.append(row);
  }
}
function renderAttendance(percent, year, role) {
  const root = $("asistenciaGeneral");
  root.replaceChildren();
  const safe = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null;
  const ring = text("div", "attendance-ring");
  if (safe !== null) {
    ring.style.setProperty("--attendance", safe.toFixed(1) + "%");
    ring.classList.add("has-attendance");
  }
  ring.append(text("strong", "", safe === null ? "—" :
    safe.toLocaleString("es-CL", {maximumFractionDigits:1}) + "%"),
    text("small", "", "Asistencia"));
  const copy = text("div", "attendance-copy");
  copy.append(text("strong", "", role === "director" ? "Resumen " + year : "Seguimiento deportivo"),
    text("p", "", safe === null ?
      "Todavía no hay registros cerrados para calcular la asistencia." :
      "Porcentaje de asistencias registradas en actividades cerradas."));
  root.append(ring, copy);
}
async function loadInsights(id, role, version) {
  renderStats(role === "director" ?
    [["Jugadores activos","—","♧","Plantel"],["Categorías","—","▦","Divisiones"],
     ["Entrenadores","—","♟","Cuerpo técnico"],["Actividades cerradas","—","▣","Temporada actual"]] :
    [["Mis categorías","—","▦","Asignadas"],["Actividades abiertas","—","▣","Pendientes"],
     ["Actividades cerradas","—","✓","Finalizadas"],["Asistencias pendientes","—","◷","Por registrar"]]);
  renderAttendance(null, new Date().getUTCFullYear(), role);
  $("proximasDirector").replaceChildren(text("p", "", "Cargando actividades..."));
  const year = new Date().getUTCFullYear();
  const calls = role === "director" ?
    [api("/" + id + "/categorias"), api("/" + id + "/jugadores"),
      api("/" + id + "/entrenadores"),
      api("/" + id + "/estadisticas/resumen?anio=" + year),
      api("/" + id + "/eventos")] :
    [api("/" + id + "/mis-categorias"), api("/" + id + "/eventos")];
  const results = await Promise.allSettled(calls);
  if (version !== selectionVersion || id !== selectedSchool) return;
  const get = index => results[index].status === "fulfilled" ? results[index].value : null;
  if (role === "director") {
    const cats = get(0)?.categorias || [];
    const players = get(1)?.jugadores || [];
    const trainers = get(2)?.entrenadores || [];
    const totals = get(3)?.totales;
    const events = get(4)?.eventos || [];
    renderStats([
      ["Jugadores activos", get(1) ? players.filter(p => p.estado === "activo").length : "—", "♧", "Plantel de la academia"],
      ["Categorías", get(0) ? cats.filter(c => c.estado === "activa").length : "—", "▦", "Divisiones activas"],
      ["Entrenadores", get(2) ? trainers.filter(c => c.estado === "activo").length : "—", "♟", "Personal activo"],
      ["Actividades cerradas", totals?.actividades ?? "—", "▣", "Temporada " + year]
    ]);
    renderAgenda(events, cats);
    renderAttendance(totals?.porcentajeAsistencia, year, role);
  } else {
    const cats = get(0)?.categorias || [];
    const events = get(1)?.eventos || [];
    renderStats([
      ["Mis categorías", get(0) ? cats.length : "—", "▦", "Categorías asignadas"],
      ["Actividades abiertas", get(1) ? events.filter(e => !e.cerrado).length : "—", "▣", "Por completar"],
      ["Actividades cerradas", get(1) ? events.filter(e => e.cerrado).length : "—", "✓", "Finalizadas"],
      ["Asistencias pendientes", get(1) ? events.filter(e => !e.cerrado).reduce((a,e) => a + (e.pendientes || 0), 0) : "—", "◷", "Por registrar"]
    ]);
    renderAgenda(events, cats);
    renderAttendance(null, year, role);
  }
}
function setQuickLinks(id, role) {
  const paths = {
    enlaceCategorias:"categorias-escuela",
    enlaceEntrenadores:"entrenadores-escuela",
    enlaceJugadores:"jugadores-escuela",
    enlaceRegistroRapido:"registro-rapido",
    enlaceEstadisticas:"estadisticas-escuela",
    enlaceAvisos:"avisos-escuela"
  };
  for (const [linkId, name] of Object.entries(paths)) {
    const el = $(linkId);
    el.href = url(id, name);
    el.hidden = role !== "director" &&
      ["enlaceCategorias","enlaceEntrenadores","enlaceJugadores","enlaceAvisos"].includes(linkId);
  }
  $("agendaVerTodas").href = url(id, "registro-rapido");
  $("asistenciaVerReporte").href = url(id, "estadisticas-escuela");
}
function mostrarMarca(branding = {}) {
  const logo = $("escudoSeleccionado");
  const portada = $("portadaSeleccionada");
  logo.hidden = !branding?.logoUrl;
  portada.hidden = !branding?.portadaUrl;
  if (branding?.logoUrl) logo.src = branding.logoUrl;
  else logo.removeAttribute("src");
  if (branding?.portadaUrl) portada.src = branding.portadaUrl;
  else portada.removeAttribute("src");
  for (const [tipo, key] of [["Logo","logoUrl"],["Portada","portadaUrl"]]) {
    escuelaImagenes.mostrarImagen(
      $("preview" + tipo), $("sin" + tipo), branding?.[key], "Sin imagen cargada");
    $("quitar" + tipo).hidden = !branding?.[key];
  }
  if (selectedSchool) {
    window.UIPropuesta2?.refreshBrand({
      nombre: $("titulo").textContent, branding
    }, selectedSchool);
  }
}
async function selectSchool(school) {
  const version = ++selectionVersion;
  const id = String(school.id);
  const detail = await api("/" + esc(id) + "/personal");
  if (version !== selectionVersion) return;
  selectedSchool = id;
  selectedRole = detail.rol;
  selectedDetail = detail.escuela;
  document.body.classList.add("selected-school");
  $("selectorEscuelas").hidden = true;
  $("seleccion").hidden = false;
  $("panelPersonalizacion").hidden = detail.rol !== "director";
  $("panelPersonalizacion").open = location.hash === "#personalizacion" && detail.rol === "director";
  $("marcaDirector").hidden = detail.rol !== "director";
  $("imagenesDirector").hidden = detail.rol !== "director";
  $("saludoDirector").textContent = detail.rol === "director" ? "Hola, Director 👋" : "Hola, Entrenador 👋";
  $("titulo").textContent = schoolName(detail.escuela);
  $("slug").textContent = "Formación · Valores · Competencia";
  mostrarMarca(detail.escuela.branding);
  for (const key of ["colorPrimario","colorSecundario","colorAcento","colorTexto"]) {
    const defaults = { colorPrimario:"#683ac6", colorSecundario:"#ffffff",
      colorAcento:"#f27686", colorTexto:"#24243d" };
    const field = $("director" + key[0].toUpperCase() + key.slice(1));
    field.value = detail.escuela.branding?.[key] || defaults[key];
  }
  $("directorNombrePublico").value = schoolName(detail.escuela);
  setQuickLinks(id, detail.rol);
  window.UIPropuesta2?.mountSchool(id, detail.rol, detail.escuela);
  window.history.replaceState(null, "", "/director-acceso.html?escuela=" + esc(id) +
    (location.hash === "#personalizacion" ? "#personalizacion" : ""));
  notify("");
  loadInsights(id, detail.rol, version).catch(err => notify("No se pudieron cargar todos los indicadores: " + err.message, true));
}
async function load() {
  const data = await api("/mis-escuelas");
  const schools = (data.escuelas || []).filter(s => s.roles.includes("director") || s.roles.includes("entrenador"));
  const root = $("escuelas");
  root.replaceChildren();
  for (const school of schools) {
    const btn = text("button", "school-picker-option");
    btn.type = "button";
    btn.append(text("span", "picker-logo", "⚽"),
      text("strong", "", schoolName(school)),
      text("small", "", school.roles.includes("director") ? "Dirección" : "Entrenador"),
      text("span", "picker-chevron", "→"));
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try { await selectSchool(school); }
      catch (error) { notify(error.message, true); }
      finally { btn.disabled = false; }
    });
    root.append(btn);
  }
  $("loginPanel").hidden = true;
  $("dashboard").hidden = false;
  $("salir").hidden = false;
  $("selectorEscuelas").hidden = false;
  if (!schools.length) notify("No tienes escuelas activas asignadas.", true);
  const inUrl = params.get("escuela");
  const chosen = schools.find(s => s.id === inUrl) ||
    (schools.length === 1 ? schools[0] : null);
  if (chosen) await selectSchool(chosen);
}
$("login").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    const result = await api("/auth/login", {
      email: $("email").value.trim(), password: $("password").value
    });
    sessionStorage.setItem("schoolToken", result.token);
    $("password").value = "";
    await load();
  } catch (error) { notify(error.message, true); }
  finally { button.disabled = false; }
});
$("cambiarEscuela").addEventListener("click", () => {
  selectionVersion++;
  selectedSchool = null;
  selectedRole = null;
  $("selectorEscuelas").hidden = false;
  $("seleccion").hidden = true;
  $("panelPersonalizacion").hidden = true;
  $("panelPersonalizacion").open = false;
  document.body.classList.remove("selected-school");
  window.UIPropuesta2?.clearShell();
  window.history.replaceState(null, "", "/director-acceso.html");
  $("selectorEscuelas").scrollIntoView({behavior:"smooth",block:"start"});
});
$("marcaDirector").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  if (!selectedSchool || selectedRole !== "director") return notify("Selecciona una escuela", true);
  button.disabled = true;
  try {
    const data = await api("/" + esc(selectedSchool) + "/branding", {
      nombrePublico: $("directorNombrePublico").value.trim(),
      colorPrimario: $("directorColorPrimario").value,
      colorSecundario: $("directorColorSecundario").value,
      colorAcento: $("directorColorAcento").value,
      colorTexto: $("directorColorTexto").value
    }, "PATCH");
    selectedDetail = data.escuela;
    $("titulo").textContent = schoolName(data.escuela);
    mostrarMarca(data.escuela.branding);
    notify("Identidad visual actualizada");
  } catch (error) { notify(error.message, true); }
  finally { button.disabled = false; }
});
for (const [tipo, nombre] of [["logo","Logo"],["portada","Portada"]]) {
  $("subir" + nombre).addEventListener("click", async event => {
    if (!selectedSchool || selectedRole !== "director") return notify("Selecciona una escuela", true);
    const archivo = $("archivo" + nombre).files?.[0];
    if (!archivo) return notify("Selecciona una imagen primero", true);
    const button = event.currentTarget; button.disabled = true;
    try {
      notify("Preparando imagen...");
      const base64 = await escuelaImagenes.obtenerBase64(archivo, tipo);
      const data = await api("/" + esc(selectedSchool) + "/media/" + tipo, {base64}, "PUT");
      selectedDetail = data.escuela;
      mostrarMarca(data.escuela.branding);
      $("archivo" + nombre).value = "";
      notify("Imagen actualizada correctamente");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });
  $("quitar" + nombre).addEventListener("click", async event => {
    if (!selectedSchool || selectedRole !== "director" ||
        !confirm("¿Retirar esta imagen de tu escuela?")) return;
    const button = event.currentTarget; button.disabled = true;
    try {
      const response = await fetch(BASE + "/" + esc(selectedSchool) + "/media/" + tipo, {
        method:"DELETE", headers:{Authorization:"Bearer " + token()}
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo retirar la imagen");
      mostrarMarca(data.escuela.branding);
      notify("Imagen retirada correctamente");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });
}
$("salir").addEventListener("click", () => {
  logout();
  notify("Sesión cerrada");
});
if (token()) load().catch(err => { logout(); notify(err.message, true); });
})();