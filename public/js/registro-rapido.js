(() => {
"use strict";
const $ = id => document.getElementById(id);
const escuelaId = new URLSearchParams(location.search).get("escuela");
const queryEvent = new URLSearchParams(location.search).get("evento");
const token = sessionStorage.getItem("schoolToken");
const base = "/api/escuela-sesion/" + encodeURIComponent(escuelaId || "");
const metricas = ["goles", "asistenciasGol", "pasesClave", "recuperaciones",
  "tirosArco", "faltasCometidas", "faltasRecibidas"];
const booleanas = ["amarilla", "roja"];
let evento = null, revision = 0, roster = [], saved = new Map(),
  dirty = new Map(), undoHistory = [], timer = null, saving = false,
  conflict = false, lastEventId = null, retryMs = 3000;
const note = message => { $("mensaje").textContent = message; };
const status = message => { $("guardarEstado").textContent = message; };

async function api(path, method = "GET", body) {
  const response = await fetch(base + path, {
    method, headers: {
      "Content-Type": "application/json", Authorization: "Bearer " + token
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) {
    const error = new Error(data.error || "Error HTTP " + response.status);
    error.code = data.codigo || String(response.status);
    throw error;
  }
  return data;
}
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function defaults() {
  return { goles: 0, asistenciasGol: 0, pasesClave: 0,
    recuperaciones: 0, tirosArco: 0, faltasCometidas: 0,
    faltasRecibidas: 0, amarilla: false, roja: false, rendimiento: null };
}
function normalized(row) {
  return {
    jugadorId: row.jugadorId, nombre: row.nombre,
    asistencia: row.asistencia || "pendiente",
    estadisticas: { ...defaults(), ...row.estadisticas },
    observacion: row.observacion || ""
  };
}
function changes(row, baseline) {
  const change = { jugadorId: row.jugadorId };
  if (row.asistencia !== baseline.asistencia) change.asistencia = row.asistencia;
  if (row.observacion !== baseline.observacion) change.observacion = row.observacion;
  const stats = {};
  for (const key of [...metricas, ...booleanas, "rendimiento"]) {
    if (row.estadisticas[key] !== baseline.estadisticas[key]) {
      stats[key] = row.estadisticas[key];
    }
  }
  if (Object.keys(stats).length && row.asistencia === "presente") {
    change.estadisticas = stats;
  }
  return Object.keys(change).length > 1 ? change : null;
}
function recheck() {
  dirty = new Map();
  for (const row of roster) {
    const baseRow = saved.get(row.jugadorId);
    if (!baseRow) continue;
    const change = changes(row, baseRow);
    if (change) dirty.set(row.jugadorId, change);
  }
  $("guardar").disabled = evento?.cerrado || !dirty.size || saving || conflict || !navigator.onLine;
  $("deshacer").disabled = evento?.cerrado || !undoHistory.length || saving || conflict;
  const pendingCount = roster.filter(r => r.asistencia === "pendiente").length;
  $("marcarPendientes").hidden = !evento || evento.cerrado || !pendingCount;
  $("marcarPendientes").disabled = saving || conflict;
  $("marcarPendientes").textContent = "✓ Confirmar " + pendingCount + " presente(s) pendientes";
  $("cerrar").disabled = evento?.cerrado || saving || conflict;
  $("sincronizar").hidden = !conflict;
  if (!navigator.onLine && dirty.size) status("Sin conexión · No cierres esta pestaña; tus cambios aún NO están guardados");
  else if (conflict) status("Guardado detenido · Revisa el mensaje. Tus cambios siguen aquí");
  else if (saving) status("Guardando...");
  else if (dirty.size) status(dirty.size + " jugador(es) con cambios sin guardar");
  else status("✓ Todo guardado");
}
function schedule() {
  clearTimeout(timer);
  recheck();
  if (!dirty.size || conflict || evento?.cerrado || !navigator.onLine) return;
  timer = setTimeout(() => saveNow(), 1500);
}
function mutate(id, action) {
  if (!evento || evento.cerrado || conflict) return;
  const row = roster.find(r => r.jugadorId === id);
  if (!row) return;
  const old = clone(row);
  action(row);
  if (JSON.stringify(old) === JSON.stringify(row)) return;
  undoHistory.push({ id, before: old });
  if (undoHistory.length > 30) undoHistory.shift();
  renderRoster();
  schedule();
}
// Confirmación masiva solo para pendientes; NUNCA cambia ausentes o presentes.
function marcarPendientesPresentes() {
  if (!evento || evento.cerrado || conflict || saving) return;
  const pending = roster.filter(row => row.asistencia === "pendiente");
  if (!pending.length) return;
  if (!confirm("¿Confirmas la presencia de " + pending.length +
    " jugador(es) pendientes? Los ausentes registrados no cambiarán.")) return;
  undoHistory.push({ snapshots: pending.map(clone) });
  if (undoHistory.length > 30) undoHistory.shift();
  for (const row of pending) row.asistencia = "presente";
  renderRoster();
  schedule();
}
function attendance(id, state) {
  mutate(id, row => {
    if (row.asistencia === state) return;
    row.asistencia = state;
    if (state !== "presente") row.estadisticas = defaults();
  });
}
function metric(id, key, delta) {
  mutate(id, row => {
    const previous = row.estadisticas[key];
    const value = key === "rendimiento" ?
      (delta < 0 && previous === 1 ? null :
        Math.max(1, Math.min(10, (previous || 0) + delta))) :
      previous + delta;
    if (key !== "rendimiento" && (value < 0 || value > 99)) return;
    if (value === previous) return;
    if (row.asistencia !== "presente") {
      if (delta < 0) return;
      row.asistencia = "presente";
    }
    row.estadisticas[key] = value;
  });
}
function toggleCard(id, key) {
  mutate(id, row => {
    if (row.asistencia !== "presente") row.asistencia = "presente";
    row.estadisticas[key] = !row.estadisticas[key];
  });
}
function btn(label, className, action, disabled) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.disabled = Boolean(disabled);
  button.addEventListener("click", action);
  return button;
}
function renderRoster() {
  const selected = $("metrica").value;
  const label = $("metrica").selectedOptions[0]?.textContent || "Estadística";
  const search = $("buscar").value.toLocaleLowerCase("es-CL");
  const filter = $("filtro").value;
  const root = $("jugadores"); root.replaceChildren();
  const visible = roster.filter(p =>
    (filter === "todos" || p.asistencia === filter) &&
    p.nombre.toLocaleLowerCase("es-CL").includes(search)
  );
  for (const row of visible) {
    const card = document.createElement("article");
    card.className = "jugador-rapido" + (dirty.has(row.jugadorId) ? " editado" : "") +
      (evento.cerrado ? " registro-cerrado" : "");
    const top = document.createElement("div"); top.className = "fila-jugador";
    const name = document.createElement("div"); name.className = "datos-jugador";
    const title = document.createElement("strong"); title.textContent = row.nombre;
    const badge = document.createElement("small");
    badge.textContent = row.asistencia === "presente" ? "Presente" :
      row.asistencia === "ausente" ? "Ausente" : "Pendiente de asistencia";
    name.append(title, badge);
    const options = document.createElement("div"); options.className = "asistencias";
    for (const [value, title] of [
      ["presente", "✓ Presente"], ["ausente", "✕ Ausente"], ["pendiente", "· Pendiente"]
    ]) {
      const active = row.asistencia === value ? " activo-" + value : "";
      options.append(btn(title, active, () => attendance(row.jugadorId, value),
        evento.cerrado || conflict));
    }
    top.append(name, options); card.append(top);
    const bottom = document.createElement("div"); bottom.className = "fila-metricas";
    const metrica = document.createElement("div"); metrica.className = "marcador";
    const metricLabel = document.createElement("span"); metricLabel.textContent = label + ":";
    const count = document.createElement("output");
    count.textContent = row.estadisticas[selected] ?? "—";
    const decrement = btn("−", "", () => metric(row.jugadorId, selected, -1),
      evento.cerrado || conflict || row.estadisticas[selected] === 0 ||
        (selected === "rendimiento" && row.estadisticas[selected] === null));
    decrement.setAttribute("aria-label", "Quitar " + label + " a " + row.nombre);
    const increment = btn("+", "", () => metric(row.jugadorId, selected, +1),
      evento.cerrado || conflict || row.estadisticas[selected] >=
        (selected === "rendimiento" ? 10 : 99));
    increment.setAttribute("aria-label", "Añadir " + label + " a " + row.nombre);
    metrica.append(metricLabel, decrement, count, increment);
    bottom.append(metrica);
    if (evento.tipoEvento !== "Entrenamiento") {
      const cards = document.createElement("div"); cards.className = "tarjetas";
      for (const [key, text] of [["amarilla", "🟨 Amarilla"], ["roja", "🟥 Roja"]]) {
        cards.append(btn(text, row.estadisticas[key] ?
          key + "-marcada" : "", () => toggleCard(row.jugadorId, key),
          evento.cerrado || conflict));
      }
      bottom.append(cards);
    }
    card.append(bottom);
    const note = document.createElement("details");
    note.className = "nota-jugador";
    const summary = document.createElement("summary");
    summary.textContent = "Nota opcional" + (row.observacion ? " · escrita" : "");
    const textarea = document.createElement("textarea");
    textarea.maxLength = 500;
    textarea.placeholder = "Observación breve para este evento";
    textarea.value = row.observacion;
    textarea.disabled = evento.cerrado || conflict;
    textarea.addEventListener("input", () => {
      const record = roster.find(r => r.jugadorId === row.jugadorId);
      if (record) {
        record.observacion = textarea.value;
        summary.textContent = "Nota opcional" +
          (record.observacion ? " · escrita" : "");
        schedule();
      }
    });
    note.append(summary, textarea); card.append(note);
    root.append(card);
  }
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.textContent = "No hay jugadores con estos filtros.";
    root.append(empty);
  }
  const present = roster.filter(r => r.asistencia === "presente").length;
  const absent = roster.filter(r => r.asistencia === "ausente").length;
  $("contador").textContent = roster.length + " jugadores · " +
    present + " presentes · " + absent + " ausentes · " +
    (roster.length - present - absent) + " pendientes";
  recheck();
}
async function saveNow() {
  clearTimeout(timer);
  if (!evento || evento.cerrado || conflict || !dirty.size || saving) return false;
  if (!navigator.onLine) {
    note("Sin conexión. No cierres esta pestaña; las anotaciones todavía no se guardan en el servidor.");
    recheck();
    return false;
  }
  saving = true; recheck();
  const payload = { revision, cambios: clone([...dirty.values()]) };
  try {
    const data = await api("/eventos/" + evento._id + "/registros",
      "PATCH", payload);
    revision = data.revision;
    for (const change of payload.cambios) {
      const old = saved.get(change.jugadorId);
      if (!old) continue;
      if (change.asistencia !== undefined) {
        old.asistencia = change.asistencia;
        if (old.asistencia !== "presente") old.estadisticas = defaults();
      }
      if (change.estadisticas && old.asistencia === "presente") {
        Object.assign(old.estadisticas, change.estadisticas);
      }
      if (change.observacion !== undefined) old.observacion = change.observacion;
    }
    // Mantener deshacer también después del guardado automático: revertir
    // una acción genera un NUEVO cambio que puede guardarse normalmente.
    retryMs = 3000;
    note("");
    return true;
  } catch (error) {
    if (error.code === "VERSION_CONFLICT") {
      conflict = true;
      note("Otro dispositivo guardó cambios. Tus anotaciones siguen visibles. Selecciona Sincronizar cambios para revisarlas.");
    } else if (["401", "403", "404", "409"].includes(error.code)) {
      conflict = true;
      note("No se pueden guardar estos cambios: " + error.message +
        ". Revisa tu sesión o el estado de la actividad; conserva las anotaciones en pantalla.");
    } else {
      retryMs = Math.min(retryMs * 2, 30000);
      note("No se pudo guardar: " + error.message +
        ". Tus anotaciones permanecen visibles; puedes pulsar Guardar ahora.");
    }
    return false;
  } finally {
    saving = false; recheck();
    if (dirty.size && !conflict && !evento.cerrado) {
      if (navigator.onLine) {
        timer = setTimeout(() => saveNow(), retryMs);
      }
    }
  }
}
async function synchronize() {
  if (!conflict || !evento) return;
  const old = saved;
  try {
    const data = await api("/eventos/" + evento._id);
    if (data.evento.cerrado) {
      note("La actividad se cerró desde otro dispositivo. No se pueden enviar los cambios pendientes.");
      return;
    }
    const fresh = data.jugadores.map(normalized);
    const byId = new Map(fresh.map(r => [r.jugadorId, r]));
    let overlapping = 0;
    for (const change of dirty.values()) {
      const current = byId.get(change.jugadorId);
      const baseline = old.get(change.jugadorId);
      if (!current || !baseline) {
        note("Cambió la lista de jugadores. Revisa antes de continuar.");
        return;
      }
      if (change.asistencia !== undefined &&
          current.asistencia !== baseline.asistencia) overlapping++;
      if (change.observacion !== undefined &&
          current.observacion !== baseline.observacion) overlapping++;
      for (const key of Object.keys(change.estadisticas || {})) {
        if (current.estadisticas[key] !== baseline.estadisticas[key]) overlapping++;
      }
    }
    if (overlapping && !confirm(
      "Hay " + overlapping + " dato(s) editados también en otro dispositivo. " +
      "¿Mantener tus valores para esos campos? Se conservarán los demás cambios remotos."
    )) return;
    saved = new Map(fresh.map(r => [r.jugadorId, clone(r)]));
    for (const change of dirty.values()) {
      const r = byId.get(change.jugadorId);
      if (change.asistencia !== undefined) {
        r.asistencia = change.asistencia;
        if (r.asistencia !== "presente") r.estadisticas = defaults();
      }
      if (change.estadisticas && r.asistencia === "presente") {
        Object.assign(r.estadisticas, change.estadisticas);
      }
      if (change.observacion !== undefined) r.observacion = change.observacion;
    }
    roster = fresh;
    revision = data.evento.revision;
    undoHistory = [];
    conflict = false;
    renderRoster();
    schedule();
    note("Sincronizado. Se conservan tus anotaciones pendientes.");
  } catch (error) { note("No se pudo sincronizar: " + error.message); }
}
async function openEvent(id) {
  if (dirty.size && !confirm("Tienes anotaciones sin guardar. ¿Salir igualmente?")) return;
  clearTimeout(timer);
  const data = await api("/eventos/" + id);
  evento = data.evento;
  lastEventId = id;
  revision = evento.revision;
  roster = data.jugadores.map(normalized);
  saved = new Map(roster.map(r => [r.jugadorId, clone(r)]));
  dirty.clear(); undoHistory = []; conflict = false;
  $("seleccionPanel").hidden = true;
  $("actividadPanel").hidden = false;
  $("eventoTitulo").textContent = evento.categoriaNombre + " · " +
    evento.fechaEvento.slice(0, 10);
  $("verInforme").href = "/estadisticas-escuela.html?escuela=" +
    encodeURIComponent(escuelaId) + "&categoria=" +
    encodeURIComponent(evento.categoria);
  $("tipoEvento").textContent = evento.tipoEvento + (evento.cerrado ? " · CERRADO" : "");
  $("metrica").value = evento.tipoEvento === "Entrenamiento" ?
    "recuperaciones" : "goles";
  $("cerrar").hidden = evento.cerrado;
  window.history.replaceState(null, "", "?escuela=" +
    encodeURIComponent(escuelaId) + "&evento=" + encodeURIComponent(id));
  renderRoster();
  note(evento.cerrado ? "Actividad cerrada: solo lectura." : "");
}
async function loadEvents() {
  const [events, schools] = await Promise.all([
    api("/eventos"),
    fetch("/api/escuela-sesion/mis-escuelas", {
      headers: { Authorization: "Bearer " + token }
    }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sin autorización");
      return result;
    })
  ]);
  const current = schools.escuelas?.find(s => String(s.id) === escuelaId);
  $("escuelaTitulo").textContent = current?.branding?.nombrePublico ||
    current?.nombre || "Mi escuela";
  $("verInforme").href = "/estadisticas-escuela.html?escuela=" +
    encodeURIComponent(escuelaId);
  const director = current?.roles?.includes("director");
  const primary = current?.branding?.colorPrimario;
  if (/^#[0-9A-Fa-f]{6}$/.test(primary || "")) {
    document.documentElement.style.setProperty("--cancha-marca", primary);
    const rgb = [1, 3, 5].map(i => parseInt(primary.slice(i, i + 2), 16) / 255);
    const luminance = rgb.map(x => x <= 0.04045 ? x / 12.92 :
      ((x + 0.055) / 1.055) ** 2.4)
      .reduce((sum, component, i) => sum + component * [0.2126, 0.7152, 0.0722][i], 0);
    document.documentElement.style.setProperty("--cancha-contraste",
      luminance > 0.179 ? "#111827" : "#ffffff");
  }
  // Director: categorías de su escuela. Entrenador: únicamente asignadas.
  const res = await api("/mis-categorias");
  $("categoriaId").replaceChildren(new Option("Selecciona categoría", ""));
  for (const cat of res.categorias) {
    $("categoriaId").add(new Option(
      cat.nombre + " · " + cat.modalidad, cat._id));
  }
  $("crearEventoForm").hidden = !res.categorias.length;
  $("listaEventos").replaceChildren();
  for (const e of events.eventos) {
    const item = document.createElement("div");
    item.className = "evento-item";
    const details = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = e.tipoEvento + " · " + e.fechaEvento.slice(0, 10);
    const line = document.createElement("p");
    const category = res.categorias.find(c => String(c._id) === String(e.categoria));
    line.textContent = (category ? category.nombre + " · " + category.modalidad + " · " : "") +
      e.cantidadJugadores + " jugadores · "
      e.pendientes + " pendientes" + (e.cerrado ? " · cerrado" : "");
    details.append(title, line);
    item.append(details, btn(e.cerrado ? "Ver resumen" : "Registrar ahora", "",
      () => openEvent(e._id).catch(err => note(err.message))));
    $("listaEventos").append(item);
  }
  if (!events.eventos.length) {
    const p = document.createElement("p");
    p.textContent = res.categorias.length ?
      "Inicia el entrenamiento o partido de tu categoría para comenzar." :
      "No tienes categorías activas asignadas.";
    $("listaEventos").append(p);
  }
}
window.addEventListener("offline", () => {
  clearTimeout(timer);
  note("Sin conexión. Los cambios pendientes no se han guardado. Mantén abierta esta pestaña.");
  recheck();
});
window.addEventListener("online", () => {
  note("Conexión recuperada. Sincronizando anotaciones pendientes...");
  if (conflict) recheck();
  else schedule();
});
$("crearEventoForm").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const data = await api("/eventos", "POST", {
      categoriaId: $("categoriaId").value,
      fechaEvento: $("fecha").value,
      tipoEvento: $("tipo").value
    });
    await loadEvents();
    await openEvent(data.evento._id);
  } catch (error) { note(error.message); }
  finally { button.disabled = false; }
});
$("metrica").addEventListener("change", renderRoster);
$("buscar").addEventListener("input", renderRoster);
$("filtro").addEventListener("change", renderRoster);
$("guardar").addEventListener("click", saveNow);
$("sincronizar").addEventListener("click", synchronize);
$("marcarPendientes").addEventListener("click", marcarPendientesPresentes);
$("deshacer").addEventListener("click", () => {
  if (!undoHistory.length || saving || conflict) return;
  const last = undoHistory.pop();
  if (last.snapshots) {
    const restored = new Map(last.snapshots.map(row => [row.jugadorId, row]));
    roster = roster.map(row => restored.get(row.jugadorId) || row);
  } else {
    const index = roster.findIndex(r => r.jugadorId === last.id);
    if (index >= 0) roster[index] = last.before;
  }
  renderRoster(); schedule();
});
$("cerrar").addEventListener("click", async () => {
  if (dirty.size && !(await saveNow())) return;
  if (!confirm("¿Cerrar la actividad? Ya no se podrá editar desde este panel.")) return;
  try {
    await api("/eventos/" + evento._id + "/cerrar", "POST", {});
    evento.cerrado = true;
    $("cerrar").hidden = true;
    renderRoster();
    note("Actividad cerrada.");
  } catch (error) { note(error.message); }
});
$("volver").addEventListener("click", async () => {
  if (dirty.size && !(await saveNow())) return;
  $("actividadPanel").hidden = true;
  $("seleccionPanel").hidden = false;
  evento = null; window.history.replaceState(null, "",
    "?escuela=" + encodeURIComponent(escuelaId));
  await loadEvents().catch(e => note(e.message));
});
window.addEventListener("beforeunload", event => {
  if (dirty.size && !evento?.cerrado) {
    event.preventDefault();
    event.returnValue = "";
  }
});
(async () => {
  if (!/^[a-f0-9]{24}$/i.test(escuelaId || "") || !token) {
    note("Inicia sesión y selecciona tu escuela para registrar estadísticas.");
    return;
  }
  const hoy = new Date();
  $("fecha").value = [hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0")].join("-");
  $("seleccionPanel").hidden = false;
  try {
    await loadEvents();
    if (queryEvent && /^[a-f0-9]{24}$/i.test(queryEvent)) {
      await openEvent(queryEvent);
    }
  } catch (error) { note(error.message); }
})();
})();
