(() => {
"use strict";
const $ = id => document.getElementById(id);
const token = new URLSearchParams(location.hash.slice(1)).get("token");
history.replaceState(null, "", location.pathname);
const note = text => { $("resultado").textContent = text; };
async function api(path, body, bearer) {
  const response = await fetch("/api/escuela-sesion" + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json",
      ...(bearer ? { Authorization: "Bearer " + bearer } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Ocurrió un error");
  return result;
}
(async () => {
  try {
    if (!token) throw new Error("Invitación inválida");
    const invitation = await api("/invitaciones-familia/consultar?token=" +
      encodeURIComponent(token));
    $("escuela").textContent = "Invitación de " + invitation.escuela.nombre;
    $("correo").textContent = invitation.email;
    $("nombre").value = invitation.nombre;
    $("email").value = invitation.email;
    $(invitation.requiereInicioSesion ? "existente" : "nuevo").hidden = false;
  } catch (error) { note(error.message); }
})();
$("nuevo").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const result = await api("/invitaciones-familia/aceptar", {
      token, nombre: $("nombre").value.trim(), password: $("password").value
    });
    $("password").value = "";
    $("nuevo").hidden = true;
    note(result.mensaje);
  } catch (error) { note(error.message); }
  finally { button.disabled = false; }
});
$("existente").addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.submitter; button.disabled = true;
  try {
    const session = await api("/auth/login", {
      email: $("email").value, password: $("passwordExistente").value
    });
    const result = await api("/invitaciones-familia/aceptar-existente",
      { token }, session.token);
    $("passwordExistente").value = "";
    $("existente").hidden = true;
    note(result.mensaje);
  } catch (error) { note(error.message); }
  finally { button.disabled = false; }
});
})();