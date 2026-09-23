(() => {
"use strict";
const $ = id => document.getElementById(id);
const BASE = "/api/escuela-sesion";
const notify = text => { $("mensaje").textContent = text; };
const token = () => sessionStorage.getItem("schoolToken");
function logout() {
  sessionStorage.removeItem("schoolToken");
  $("loginPanel").hidden = false; $("dashboard").hidden = true; $("salir").hidden = true;
  $("seleccion").hidden = true;
}
async function api(path, data) {
  const r = await fetch(BASE + path, {
    method: data ? "POST" : "GET",
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
        $("seleccion").style.backgroundColor = detail.escuela.branding?.colorSecundario || "#ffffff";
        $("seleccion").style.color = detail.escuela.branding?.colorTexto || "#111827";
        $("seleccion").style.borderColor = detail.escuela.branding?.colorPrimario || "#166534";
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
$("salir").addEventListener("click", () => { logout(); notify("Sesión cerrada"); });
if (token()) load().catch(e => { logout(); notify(e.message); });
})();
