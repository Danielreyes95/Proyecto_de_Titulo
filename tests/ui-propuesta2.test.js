const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = name => fs.readFileSync(path.join(root, name), "utf8");

const pages = [
 "plataforma.html", "director-acceso.html",
 "categorias-escuela.html", "entrenadores-escuela.html",
 "jugadores-escuela.html", "registro-rapido.html",
 "estadisticas-escuela.html", "avisos-escuela.html",
 "familia-acceso.html", "activar-director.html",
 "activar-entrenador.html", "activar-apoderado.html"
];

test("Las 12 páginas multiescuela usan SOLO la nueva hoja visual", () => {
 for (const page of pages) {
   const html = source("public/" + page);
   const stylesheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m=>m[1]);
   assert.deepEqual(stylesheets, ["/assets/css/app-v2.css?v=3.0.1"], page);
   assert.ok(html.includes("/js/ui-propuesta2.js?v=3.0.0"), page);
   assert.ok(!html.includes("/assets/css/plataforma.css"), page);
   assert.ok(!html.includes("/assets/css/ui-propuesta2.css"), page);
 }
});

test("Las páginas tienen IDs únicos y sus formularios originales no se pierden", () => {
 const formIds = {
   "plataforma.html":["loginForm","crearForm","marcaForm","invitarForm","escuelasVisuales","escuelasBody","escuelaMarca","adminSubirLogo","adminSubirPortada"],
   "director-acceso.html":["login","dashboard","seleccion","resumenDirector","proximasDirector","asistenciaGeneral","marcaDirector","imagenesDirector"],
   "categorias-escuela.html":["categoriasCards","categoriaForm","tabla","nuevaCategoria","editorCategoria"],
   "entrenadores-escuela.html":["entrenadoresCards","entrenadorForm","asignacionForm","tabla","editorEntrenador"],
   "jugadores-escuela.html":["jugadorForm","apoderadoForm","tabla","tablaApoderados","vincularDialog","filtroCategoria"],
   "registro-rapido.html":["seleccionPanel","actividadPanel","crearEventoForm","listaEventos","jugadores","guardar","cerrar","deshacer","sincronizar"],
   "estadisticas-escuela.html":["categoria","anio","recargar","tipos","meses","tabla","chartEvolution","asistenciaDonut"],
   "avisos-escuela.html":["formulario","listado","nuevoAviso","publicar","categoria"],
   "familia-acceso.html":["login","dashboard","contenido","agenda","avisos","jugadores","familiaPlayersCount"],
   "activar-director.html":["escuela","correo","nuevo","existente","passwordExistente"],
   "activar-entrenador.html":["escuela","correo","nuevo","existente","passwordExistente"],
   "activar-apoderado.html":["escuela","correo","nuevo","existente","passwordExistente"]
 };
 for (const [page, expected] of Object.entries(formIds)) {
   const html = source("public/" + page);
   const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
   const duplicates = ids.filter((id,i)=>ids.indexOf(id)!==i);
   assert.deepEqual(duplicates, [], page + " tiene IDs duplicados");
   for(const id of expected) assert.ok(ids.includes(id), page + " sin #" + id);
 }
});

test("Dashboard del Director representa métricas reales y mantiene los permisos", () => {
 const html=source("public/director-acceso.html");
 const code=source("public/js/director-acceso.js");
 assert.ok(html.includes('id="proximasDirector"'));
 assert.ok(html.includes('id="asistenciaGeneral"'));
 assert.ok(html.includes('id="panelPersonalizacion"'));
 for(const endpoint of ["/mis-escuelas","/personal","/jugadores","/categorias","/entrenadores","/estadisticas/resumen","/eventos"]) {
   assert.ok(code.includes(endpoint), "Falta " + endpoint);
 }
 assert.ok(code.includes('selectedRole !== "director"'));
 assert.ok(code.includes("Promise.allSettled"));
 assert.ok(code.includes("renderAgenda(events, cats)"));
 assert.ok(code.includes("renderAttendance"));
});

test("Categorías y entrenadores presentan tarjetas editables de datos reales", () => {
 const categories=source("public/js/categorias-escuela.js");
 const trainers=source("public/js/entrenadores-escuela.js");
 assert.ok(categories.includes("categoriasCards"));
 assert.ok(categories.includes('$("editorCategoria").open = true'));
 assert.ok(trainers.includes("entrenadoresCards"));
 assert.ok(trainers.includes('$("editorEntrenador").open = true'));
});

test("Jugadores permite filtrar y vincular familias con un diálogo real", () => {
 const code=source("public/js/jugadores-escuela.js");
 for(const key of ["filtrarJugadores","buscarJugadores","filtroCategoria","filtroEstado","vincularDialog","showModal()","vincularSeleccion"]) {
   assert.ok(code.includes(key), key);
 }
 assert.ok(code.includes('api("/jugadores/" + vinculandoJugador + "/apoderados"'));
});

test("Registro rápido mantiene guardado, sincronización y nueva guía visual", () => {
 const code=source("public/js/registro-rapido.js");
 for(const key of ["stepper(","saveNow()","synchronize()","undoHistory","schedule()","dirty","recheck()"]) {
   assert.ok(code.includes(key), key);
 }
 assert.ok(source("public/registro-rapido.html").includes('data-step="3"'));
});

test("Gráficos de estadísticas reflejan los datos de la API", () => {
 const code=source("public/js/estadisticas-escuela.js");
 assert.ok(code.includes("renderYearChart(data.porMes)"));
 assert.ok(code.includes("renderDonut(data.resumen.porcentajeAsistencia"));
 assert.ok(code.includes("document.createElement"));
});

test("Portal familiar aplica branding y no solicita datos de otras escuelas", () => {
 const code=source("public/js/familia-acceso.js");
 assert.ok(code.includes("UIPropuesta2?.mountFamily(id, data.escuela)"));
 assert.ok(code.includes("familiaPlayersCount"));
 assert.ok(code.includes("/familia/mis-jugadores"));
 assert.ok(code.includes("/familia/agenda"));
});

test("El menú se autoriza con la API, tiene salida y no concede roles desde la URL", () => {
 const code=source("public/js/ui-propuesta2.js");
 for(const fragment of [
  'sessionStorage.getItem("schoolToken")',
  '"/personal"',
  'Authorization:"Bearer " + token',
  "response.ok","mountSchool(id, data.rol, data.escuela)",
  "app-topbar-logout", "mountPlatform", "mountFamily", "applyBrand"
 ]) assert.ok(code.includes(fragment), fragment);
 assert.ok(!code.includes("require("));
});

test("App v3 incluye componentes, contraste y diseño adaptable", () => {
 const css=source("public/assets/css/app-v2.css");
 for(const fragment of [
   ".school-hero",".dashboard-four",".category-card-grid",".coach-card-grid",
   ".roster-filters",".cancha-steps",".report-month-chart",".notice-card-list",
   ".family-kpis",".invitation-layout",".app-topbar-logout",
   "--ui-primary","@media(max-width:720px)","prefers-reduced-motion"
 ]) assert.ok(css.includes(fragment), fragment);
});


test("Personalización mantiene cabecera ordenada, imágenes acotadas y diseño adaptable", () => {
  const page=source("public/director-acceso.html");
  const css=source("public/assets/css/app-v2.css");
  const imageIds=["previewLogo","previewPortada"];
  assert.ok(page.includes('id="panelPersonalizacion"'));
  assert.ok(page.includes('class="identity-editor-content"'));
  imageIds.forEach(id=>assert.ok(page.includes('id="'+id+'"')));
  for(const item of [
    "#panelPersonalizacion > summary",
    "#panelPersonalizacion > summary::-webkit-details-marker",
    "#panelPersonalizacion > summary::marker",
    "#panelPersonalizacion .identity-editor-content",
    "#panelPersonalizacion #marcaDirector",
    "#panelPersonalizacion .marca-imagen-card img",
    "height:142px",
    "object-fit:contain",
    "#panelPersonalizacion .marca-imagen-card input[type=\"file\"]",
    "@media(max-width:680px)"
  ]) assert.ok(css.includes(item), "Falta regla: "+item);
});
