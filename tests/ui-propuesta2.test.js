const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const modulos = [
  "plataforma.html",
  "director-acceso.html",
  "categorias-escuela.html",
  "entrenadores-escuela.html",
  "jugadores-escuela.html",
  "registro-rapido.html",
  "estadisticas-escuela.html",
  "avisos-escuela.html",
  "familia-acceso.html",
  "activar-director.html",
  "activar-entrenador.html",
  "activar-apoderado.html"
];

test("La propuesta 2 se carga en todas las páginas multiescuela", () => {
  for (const file of modulos) {
    const html = fs.readFileSync(path.join(root, "public", file), "utf8");
    assert.ok(html.includes("/assets/css/ui-propuesta2.css"), file + " sin estilos");
    assert.ok(html.includes("/js/ui-propuesta2.js"), file + " sin interacción compartida");
  }
});

test("La navegación lee una escuela con sesión y no usa datos arbitrarios como autoridad", () => {
  const code = fs.readFileSync(path.join(root, "public/js/ui-propuesta2.js"), "utf8");
  assert.ok(code.includes('sessionStorage.getItem("schoolToken")'));
  assert.ok(code.includes('"/personal"'));
  assert.ok(code.includes('Authorization: "Bearer " + token'));
  assert.ok(code.includes('res.ok'));
  assert.ok(code.includes("require") === false, "La capa visual no debe cargar módulos Node");
});

test("Se mantiene el sistema de personalización independiente por escuela", () => {
  const ui = fs.readFileSync(path.join(root, "public/js/ui-propuesta2.js"), "utf8");
  assert.ok(ui.includes("--ui-primary"));
  assert.ok(ui.includes("--ui-accent"));
  assert.ok(ui.includes("mountSchool"));
  assert.ok(ui.includes("contrastText"));
  const director = fs.readFileSync(path.join(root, "public/js/director-acceso.js"), "utf8");
  assert.ok(director.includes("UIPropuesta2?.applyBrand"));
  assert.ok(director.includes("UIPropuesta2?.mountSchool"));
  const family = fs.readFileSync(path.join(root, "public/js/familia-acceso.js"), "utf8");
  assert.ok(family.includes("UIPropuesta2?.applyBrand"));
});
