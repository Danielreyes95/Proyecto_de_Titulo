(() => {
"use strict";
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const escuelaId = params.get("escuela");
const selectedFromLink = params.get("categoria");
const token = sessionStorage.getItem("schoolToken");
const base = "/api/escuela-sesion/" + encodeURIComponent(escuelaId || "");
const mesesNombres = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
let resultado = null;
let requestNumber = 0;

function status(message, error = false) {
  $("mensaje").textContent = message;
  $("mensaje").classList.toggle("error", error);
}
async function api(path) {
  const response = await fetch(base + path, {
    headers: { Authorization: "Bearer " + token }
  });
  let result;
  try { result = await response.json(); } catch { result = {}; }
  if (!response.ok) throw new Error(result.error || "Error HTTP " + response.status);
  return result;
}
function cell(row, value) {
  const td = row.insertCell();
  td.textContent = value;
  return td;
}
function perc(value) {
  return value === null || value === undefined ? "—" :
    value.toLocaleString("es-CL", { maximumFractionDigits: 1 }) + "%";
}
function score(value) {
  return value === null || value === undefined ? "—" :
    value.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function fecha(value) {
  return new Date(value).toLocaleDateString("es-CL", {
    timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric"
  });
}
function setColor(primary) {
  if (!/^#[0-9a-f]{6}$/i.test(primary || "")) return;
  document.documentElement.style.setProperty("--informe-marca", primary);
  const channels = [1,3,5].map(i => parseInt(primary.slice(i,i+2), 16) / 255);
  const light = channels.map(v => v <= .04045 ? v / 12.92 :
    ((v + .055) / 1.055) ** 2.4)
    .reduce((acc, v, i) => acc + v * [.2126,.7152,.0722][i], 0);
  document.documentElement.style.setProperty("--informe-contraste",
    light > .179 ? "#111827" : "#ffffff");
}
function renderTypes(list) {
  const root = $("tipos"); root.replaceChildren();
  for (const item of list) {
    const row = document.createElement("div"); row.className = "tipo-item";
    const title = document.createElement("span");
    title.textContent = item.tipo;
    const n = document.createElement("strong");
    n.textContent = item.actividades;
    row.append(title, n); root.append(row);
  }
}
function renderMonths(list) {
  const root = $("meses"); root.replaceChildren();
  const max = Math.max(1, ...list.map(m => m.actividades));
  for (const [index, month] of list.entries()) {
    const row = document.createElement("div"); row.className = "mes-item";
    const title = document.createElement("span"); title.className = "mes-nombre";
    title.textContent = mesesNombres[index];
    const bar = document.createElement("div"); bar.className = "barra-base";
    const fill = document.createElement("div"); fill.className = "barra-valor";
    fill.style.width = (month.actividades / max * 100) + "%";
    bar.title = month.actividades + " actividades cerradas";
    bar.append(fill);
    const total = document.createElement("span"); total.className = "mes-valor";
    total.textContent = month.actividades + " activ.";
    row.append(title, bar, total); root.append(row);
  }
}
async function showDetail(player) {
  if (!resultado) return;
  const categoria = $("categoria").value;
  const anio = $("anio").value;
  const current = ++requestNumber;
  status("Cargando historial del jugador...");
  try {
    const detail = await api("/estadisticas/categorias/" +
      encodeURIComponent(categoria) + "/jugadores/" +
      encodeURIComponent(player.jugadorId) + "?anio=" + encodeURIComponent(anio));
    if (current !== requestNumber || categoria !== $("categoria").value ||
        anio !== $("anio").value) return;
    $("detalleTitulo").textContent = detail.jugador.nombre;
    $("tablaDetalle").replaceChildren();
    for (const activity of detail.ultimasActividades) {
      const row = $("tablaDetalle").insertRow();
      cell(row, fecha(activity.fechaEvento));
      cell(row, activity.tipoEvento);
      cell(row, activity.asistencia);
      cell(row, activity.estadisticas?.goles ?? "—");
      cell(row, activity.estadisticas?.asistenciasGol ?? "—");
      cell(row, score(activity.estadisticas?.rendimiento));
    }
    if (!detail.ultimasActividades.length) {
      const row = $("tablaDetalle").insertRow();
      const td = row.insertCell(); td.colSpan = 6;
      td.textContent = "Sin actividades cerradas para este jugador en este período.";
    }
    $("detalleMas").textContent = detail.hayMas ?
      "Se muestran las 20 más recientes. El total anual aparece en la tabla principal." : "";
    $("detallePanel").hidden = false;
    $("detallePanel").scrollIntoView({ behavior: "smooth", block: "start" });
    status("");
  } catch (error) {
    if (current === requestNumber) status(error.message, true);
  }
}
function renderPlayers(players) {
  const tbody = $("tabla"); tbody.replaceChildren();
  const needle = $("buscar").value.trim().toLocaleLowerCase("es-CL");
  const filtered = players
    .filter(p => p.nombre.toLocaleLowerCase("es-CL").includes(needle))
    .sort((a,b) => a.nombre.localeCompare(b.nombre, "es-CL"));
  for (const player of filtered) {
    const row = tbody.insertRow();
    cell(row, player.nombre);
    cell(row, perc(player.porcentajeAsistencia) +
      " (" + player.presentes + "/" + (player.presentes + player.ausentes) + ")");
    cell(row, player.goles);
    cell(row, player.asistenciasGol);
    cell(row, player.recuperaciones);
    cell(row, score(player.promedioRendimiento));
    const actions = row.insertCell();
    const button = document.createElement("button");
    button.type = "button"; button.className = "secundario";
    button.textContent = "Ver historial";
    button.addEventListener("click", () => showDetail(player));
    actions.append(button);
  }
  if (!filtered.length) {
    const row = tbody.insertRow();
    const td = row.insertCell(); td.colSpan = 7;
    td.textContent = "No hay jugadores para mostrar con estos filtros.";
  }
}
function render(data) {
  $("contenido").hidden = false;
  $("detallePanel").hidden = true;
  $("tituloCategoria").textContent = data.categoria.nombre + " · " +
    data.categoria.modalidad + " · " + data.anio;
  $("totalActividades").textContent = data.resumen.actividades;
  $("porcentajeAsistencia").textContent = perc(data.resumen.porcentajeAsistencia);
  $("detalleAsistencia").textContent = data.resumen.presentes + " presentes / " +
    (data.resumen.presentes + data.resumen.ausentes) + " registros de asistencia";
  $("totalGoles").textContent = data.resumen.goles;
  $("totalAsistencias").textContent = data.resumen.asistenciasGol;
  $("irCancha").href = "/registro-rapido.html?escuela=" +
    encodeURIComponent(escuelaId);
  renderTypes(data.porTipo);
  renderMonths(data.porMes);
  renderPlayers(data.jugadores);
  status(data.resumen.actividades ? "" :
    "Este año aún no tiene actividades cerradas. Los eventos abiertos no se suman al informe.");
}
async function loadReport() {
  requestNumber++;
  const current = requestNumber;
  const cat = $("categoria").value;
  const anio = $("anio").value;
  if (!cat || !anio) {
    resultado = null; $("contenido").hidden = true;
    status("Selecciona una categoría para revisar estadísticas.");
    return;
  }
  $("recargar").disabled = true;
  status("Calculando acumulados del año...");
  try {
    const data = await api("/estadisticas/categorias/" +
      encodeURIComponent(cat) + "?anio=" + encodeURIComponent(anio));
    if (current !== requestNumber) return;
    resultado = data;
    render(data);
    const url = new URL(location.href);
    url.searchParams.set("escuela", escuelaId);
    url.searchParams.set("categoria", cat);
    url.searchParams.set("anio", anio);
    window.history.replaceState(null, "", url);
  } catch (error) {
    if (current === requestNumber) {
      resultado = null; $("contenido").hidden = true;
      status(error.message, true);
    }
  } finally { $("recargar").disabled = false; }
}
$("categoria").addEventListener("change", loadReport);
$("anio").addEventListener("change", loadReport);
$("recargar").addEventListener("click", loadReport);
$("buscar").addEventListener("input", () => {
  if (resultado) renderPlayers(resultado.jugadores);
});
$("cerrarDetalle").addEventListener("click", () => {
  $("detallePanel").hidden = true;
});
(async () => {
  if (!/^[0-9a-f]{24}$/i.test(escuelaId || "") || !token) {
    status("Inicia sesión y selecciona tu escuela antes de consultar estadísticas.", true);
    return;
  }
  try {
    const [personal, categories] = await Promise.all([
      api("/personal"),
      api("/mis-categorias?incluirInactivas=true")
    ]);
    $("nombreEscuela").textContent = personal.escuela.branding?.nombrePublico ||
      personal.escuela.nombre;
    setColor(personal.escuela.branding?.colorPrimario);
    const yearNow = new Date().getUTCFullYear();
    for (let year = yearNow + 1; year >= 2020; year--) {
      $("anio").add(new Option(String(year), String(year)));
    }
    $("anio").value = $("anio").querySelector(
      'option[value="' + params.get("anio") + '"]') ?
      params.get("anio") : String(yearNow);
    const categoriesSorted = (categories.categorias || []).sort((a,b) =>
      a.nombre.localeCompare(b.nombre, "es-CL") ||
      a.modalidad.localeCompare(b.modalidad, "es-CL"));
    for (const cat of categoriesSorted) {
      $("categoria").add(new Option(cat.nombre + " · " + cat.modalidad +
        (cat.estado === "inactiva" ? " (inactiva)" : ""), cat._id));
    }
    $("categoria").value = categoriesSorted.some(c => c._id === selectedFromLink) ?
      selectedFromLink : (categoriesSorted[0]?._id || "");
    await loadReport();
  } catch (error) { status(error.message, true); }
})();
})();
