(() => {
"use strict";
const $ = id => document.getElementById(id);
const token = new URLSearchParams(location.hash.slice(1)).get("token");
history.replaceState(null, "", location.pathname);
const notify = text => { $("resultado").textContent = text; };
async function api(path, data, bearer) {
  const response = await fetch("/api/escuela-sesion" + path, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json",
      ...(bearer ? { Authorization: "Bearer " + bearer } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Ocurrió un error");
  return body;
}
(async () => {
  try {
    if (!token) throw new Error("No se encontró una invitación válida");
    const data = await api("/invitaciones/consultar?token=" + encodeURIComponent(token));
    $("escuela").textContent = "Invitación a " + data.escuela.nombre;
    $("correo").textContent = data.email;
    $("nombre").value = data.nombre;
    $("email").value = data.email;
    $(data.requiereInicioSesion ? "existente" : "nuevo").hidden = false;
  } catch (error) { notify(error.message); }
})();
$("nuevo").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const data = await api("/invitaciones/aceptar", {
      token, nombre: $("nombre").value.trim(), password: $("password").value
    });
    $("nuevo").hidden = true; $("password").value = "";
    notify(data.mensaje + " Ahora puedes ingresar en el acceso de directores.");
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
$("existente").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const session = await api("/auth/login", {
      email: $("email").value, password: $("passwordExistente").value
    });
    const data = await api("/invitaciones/aceptar-existente",
      { token }, session.token);
    $("existente").hidden = true; $("passwordExistente").value = "";
    notify(data.mensaje + ". Ingresa normalmente en el acceso de directores.");
  } catch (error) { notify(error.message); }
  finally { button.disabled = false; }
});
})();
