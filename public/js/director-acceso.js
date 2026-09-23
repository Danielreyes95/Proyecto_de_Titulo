(() => {
"use strict";
const $ = id => document.getElementById(id);
const BASE = "/api/escuela-sesion";
let selectedSchool = null;
const notify = text => { $("mensaje").textContent = text; };
const token = () => sessionStorage.getItem("schoolToken");
function logout() {
  sessionStorage.removeItem("schoolToken");
  $("loginPanel").hidden = false; $("dashboard").hidden = true; $("salir").hidden = true;
  $("seleccion").hidden = true;
  $("marcaDirector").hidden = true;
  selectedSchool = null;
}
async function api(path, data, method = "POST") {
  const r = await fetch(BASE + path, {
    method: data ? method : "GET",
    headers: { "Content-Type": "application/json",
      ...(token() ? { Authorization: "Bearer " + token() } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "Error de conexión");
  return j;
}
async function load() {
  const data = await api("/mis-escuelas");
  $("escuelas").replaceChildren();
  for (const escuela of data.escuelas.filter(s => s.roles.includes("director"))) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = escuela.nombre;
    button.addEventListener("click", async () => {
      try {
        const detail = await api("/" + escuela.id + "/director");
        $("seleccion").hidden = false;
        $("titulo").textContent = detail.escuela.branding?.nombrePublico || detail.escuela.nombre;
        $("slug").textContent = detail.escuela.slug;
        selectedSchool = escuela.id;
        $("marcaDirector").hidden = false;
        $("directorNombrePublico").value = detail.escuela.branding?.nombrePublico || detail.escuela.nombre;
        const defaults = {
          colorPrimario: "#166534", colorSecundario: "#ffffff",
          colorAcento: "#f59e0b", colorTexto: "#111827"
        };
        for (const key of Object.keys(defaults)) {
          const id = "director" + key[0].toUpperCase() + key.slice(1);
          $(id).value = detail.escuela.branding?.[key] || defaults[key];
        }
        $("seleccion").style.backgroundColor = detail.escuela.branding?.colorSecundario || "#ffffff";
        $("seleccion").style.color = detail.escuela.branding?.colorTexto || "#111827";
        $("seleccion").style.borderColor = detail.escuela.branding?.colorPrimario || "#166534";
        let categoriesLink = $("enlaceCategorias");
        if (!categoriesLink) {
          categoriesLink = document.createElement("a");
          categoriesLink.id = "enlaceCategorias";
          categoriesLink.textContent = "Administrar categorías →";
          categoriesLink.className = "secundario";
          categoriesLink.style.display = "inline-block";
          categoriesLink.style.padding = "12px 16px";
          categoriesLink.style.borderRadius = "9px";
          $("seleccion").append(categoriesLink);
        }
        categoriesLink.href = "/categorias-escuela.html?escuela=" +
          encodeURIComponent(escuela.id);
        let coachesLink = $("enlaceEntrenadores");
        if (!coachesLink) {
          coachesLink = document.createElement("a");
          coachesLink.id = "enlaceEntrenadores";
          coachesLink.textContent = "Administrar entrenadores →";
          coachesLink.className = "secundario";
          coachesLink.style.display = "inline-block";
          coachesLink.style.padding = "12px 16px";
          coachesLink.style.borderRadius = "9px";
          coachesLink.style.marginLeft = "8px";
          $("seleccion").append(coachesLink);
        }
        coachesLink.href = "/entrenadores-escuela.html?escuela=" +
          encodeURIComponent(escuela.id);
      } catch (error) { notify(error.message); }
    });
    $("escuelas").append(button);
  }
  if (!$("escuelas").childElementCount) notify("No tienes escuelas activas asignadas.");
  $("loginPanel").hidden = true; $("dashboard").hidden = false; $("salir").hidden = false;
}
$("login").addEventListener("submit", async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    const result = await api("/auth/login", {
      email: $("email").value, password: $("password").value
    });
    sessionStorage.setItem("schoolToken", result.token);
    $("password").value = "";
    await load(); notify("Sesión iniciada");
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
$("marcaDirector").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter;
  if (!selectedSchool) return notify("Selecciona una escuela");
  button.disabled = true;
  try {
    const data = await api("/" + selectedSchool + "/branding", {
      nombrePublico: $("directorNombrePublico").value.trim(),
      colorPrimario: $("directorColorPrimario").value,
      colorSecundario: $("directorColorSecundario").value,
      colorAcento: $("directorColorAcento").value,
      colorTexto: $("directorColorTexto").value
    }, "PATCH");
    $("titulo").textContent = data.escuela.branding.nombrePublico || data.escuela.nombre;
    $("seleccion").style.backgroundColor = data.escuela.branding.colorSecundario;
    $("seleccion").style.color = data.escuela.branding.colorTexto;
    $("seleccion").style.borderColor = data.escuela.branding.colorPrimario;
    notify("Identidad visual actualizada");
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
$("salir").addEventListener("click", () => { logout(); notify("Sesión cerrada"); });
if (token()) load().catch(e => { logout(); notify(e.message); });
})();
