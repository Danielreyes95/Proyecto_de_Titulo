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

test("La propuesta 2 está integrada en las 12 páginas funcionales", () => {
  for (const file of pages) {
    const html = source("public/" + file);
    assert.ok(html.includes("/assets/css/ui-propuesta2.css"), file + " sin estilos compartidos");
    assert.ok(html.includes("/js/ui-propuesta2.js"), file + " sin navegación compartida");
  }
});

test("El Superadmin tiene un dashboard real distinto de la pantalla anterior", () => {
  const html = source("public/plataforma.html");
  for (const id of ["inicio","resumen","catalogo","escuelasVisuales","crear","identidad","invitar","escuelas","administracion","loginForm"]) {
    assert.ok(html.includes('id="' + id + '"'), "Falta " + id);
  }
  const code = source("public/js/plataforma.js");
  assert.ok(code.includes("renderCards()"), "El catálogo debe renderizar escuelas reales");
  assert.ok(code.includes("UIPropuesta2?.mountPlatform()"), "No se activa el panel visual autenticado");
  assert.ok(code.includes("safeMedia"), "Imágenes deben validarse como recursos propios");
  assert.ok(code.includes("textContent"), "Los nombres provistos por API se tratan como texto");
});

test("El menú de escuela solicita identidad con token de sesión y no concede permisos", () => {
  const code = source("public/js/ui-propuesta2.js");
  assert.ok(code.includes('sessionStorage.getItem("schoolToken")'));
  assert.ok(code.includes('"/personal"'));
  assert.ok(code.includes('Authorization:"Bearer " + token'));
  assert.ok(code.includes("response.ok"));
  assert.ok(code.includes("mountSchool(id, data.rol, data.escuela)"));
  assert.ok(!code.includes("require("), "No cargar módulos de Node en el navegador");
});

test("Director, entrenador y familia comparten componentes personalizables", () => {
  const ui = source("public/js/ui-propuesta2.js");
  for (const fragment of ["--ui-primary","--ui-accent","--ui-secondary-brand",
    "mountPlatform", "mountSchool", "mountFamily", "refreshBrand",
    "luminance", "contrast"]) {
    assert.ok(ui.includes(fragment), fragment);
  }
  const director = source("public/js/director-acceso.js");
  assert.ok(director.includes("UIPropuesta2?.mountSchool"));
  assert.ok(director.includes("UIPropuesta2?.refreshBrand"));
  const family = source("public/js/familia-acceso.js");
  assert.ok(family.includes("UIPropuesta2?.mountFamily"));
  assert.ok(family.includes("UIPropuesta2?.clearShell"));
});

test("Los controles existentes siguen disponibles para el JavaScript funcional", () => {
  const mappings = [
    ["public/plataforma.html",["crearForm","marcaForm","invitarForm","escuelasBody","escuelaMarca","adminSubirLogo","adminSubirPortada"]],
    ["public/director-acceso.html",["login","dashboard","seleccion","marcaDirector","resumenDirector","imagenesDirector"]],
    ["public/familia-acceso.html",["login","dashboard","contenido","agenda","avisos","jugadores"]],
    ["public/registro-rapido.html",["crearEventoForm","listaEventos","guardar","cerrar","jugadores"]],
    ["public/estadisticas-escuela.html",["categoria","anio","recargar","tabla"]]
  ];
  for (const [file, ids] of mappings) {
    const html = source(file);
    for (const id of ids) assert.ok(html.includes('id="' + id + '"'), file + ": faltó " + id);
  }
});
