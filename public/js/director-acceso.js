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
  $("imagenesDirector").hidden = true;
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
  for (const escuela of data.escuelas.filter(s => s.roles.includes("director") || s.roles.includes("entrenador"))) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = escuela.nombre + " · " + (escuela.roles.includes("director") ? "Dirección" : "Entrenador");
    button.addEventListener("click", async () => {
      try {
        const detail = await api("/" + escuela.id + "/personal");
        $("seleccion").hidden = false;
        $("titulo").textContent = detail.escuela.branding?.nombrePublico || detail.escuela.nombre;
        $("slug").textContent = detail.escuela.slug;
        selectedSchool = escuela.id;
        $("marcaDirector").hidden = detail.rol !== "director";
        $("imagenesDirector").hidden = detail.rol !== "director";
        mostrarMarca(detail.escuela.branding);
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
        coachesLink.hidden = detail.rol !== "director";
        categoriesLink.hidden = detail.rol !== "director";
        let playersLink = $("enlaceJugadores");
        if (!playersLink) {
          playersLink = document.createElement("a");
          playersLink.id = "enlaceJugadores";
          playersLink.textContent = "Administrar jugadores →";
          playersLink.className = "secundario";
          playersLink.style.display = "inline-block";
          playersLink.style.padding = "12px 16px";
          playersLink.style.borderRadius = "9px";
          playersLink.style.marginLeft = "8px";
          $("seleccion").append(playersLink);
        }
        playersLink.href = "/jugadores-escuela.html?escuela=" +
          encodeURIComponent(escuela.id);
        playersLink.hidden = detail.rol !== "director";
        let quickLink = $("enlaceRegistroRapido");
        if (!quickLink) {
          quickLink = document.createElement("a");
          quickLink.id = "enlaceRegistroRapido";
          quickLink.textContent = "⚡ Registro rápido en cancha →";
          quickLink.className = "secundario";
          quickLink.style.display = "inline-block";
          quickLink.style.padding = "12px 16px";
          quickLink.style.borderRadius = "9px";
          quickLink.style.marginLeft = "8px";
          $("seleccion").append(quickLink);
        }
        quickLink.href = "/registro-rapido.html?escuela=" +
          encodeURIComponent(escuela.id);
        let reportLink = $("enlaceEstadisticas");
        if (!reportLink) {
          reportLink = document.createElement("a");
          reportLink.id = "enlaceEstadisticas";
          reportLink.textContent = "📊 Estadísticas y evolución →";
          reportLink.className = "secundario";
          reportLink.style.display = "inline-block";
          reportLink.style.padding = "12px 16px";
          reportLink.style.borderRadius = "9px";
          reportLink.style.marginLeft = "8px";
          $("seleccion").append(reportLink);
        }
        reportLink.href = "/estadisticas-escuela.html?escuela=" +
          encodeURIComponent(escuela.id);
        let noticesLink = $("enlaceAvisos");
        if (!noticesLink) {
          noticesLink = document.createElement("a");
          noticesLink.id = "enlaceAvisos";
          noticesLink.className = "secundario";
          noticesLink.textContent = "✉ Avisos a las familias →";
          noticesLink.style.display = "inline-block";
          noticesLink.style.padding = "12px 16px";
          noticesLink.style.borderRadius = "9px";
          noticesLink.style.marginLeft = "8px";
          $("seleccion").append(noticesLink);
        }
        noticesLink.href = "/avisos-escuela.html?escuela=" +
          encodeURIComponent(escuela.id);
        noticesLink.hidden = detail.rol !== "director";
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
function mostrarMarca(branding = {}) {
  const logo = $("escudoSeleccionado");
  const portada = $("portadaSeleccionada");
  logo.hidden = !branding?.logoUrl;
  portada.hidden = !branding?.portadaUrl;
  if (branding?.logoUrl) logo.src = branding.logoUrl;
  else logo.removeAttribute("src");
  if (branding?.portadaUrl) portada.src = branding.portadaUrl;
  else portada.removeAttribute("src");
  for (const [tipo, field] of [["Logo", "logoUrl"], ["Portada", "portadaUrl"]]) {
    escuelaImagenes.mostrarImagen(
      $("preview" + tipo), $("sin" + tipo), branding?.[field],
      "Sin imagen cargada"
    );
    $("quitar" + tipo).hidden = !branding?.[field];
  }
}
for (const [tipo, nombre] of [["logo", "Logo"], ["portada", "Portada"]]) {
  $("subir" + nombre).addEventListener("click", async event => {
    if (!selectedSchool) return notify("Selecciona una escuela");
    const archivo = $("archivo" + nombre).files?.[0];
    if (!archivo) return notify("Selecciona una imagen primero");
    const button = event.currentTarget;
    button.disabled = true;
    try {
      notify("Preparando imagen...");
      const base64 = await escuelaImagenes.obtenerBase64(archivo, tipo);
      const result = await api("/" + selectedSchool + "/media/" + tipo,
        { base64 }, "PUT");
      mostrarMarca(result.escuela.branding);
      $("archivo" + nombre).value = "";
      notify("Imagen institucional actualizada");
    } catch (error) { notify(error.message); }
    finally { button.disabled = false; }
  });
  $("quitar" + nombre).addEventListener("click", async event => {
    if (!selectedSchool || !confirm("¿Retirar esta imagen de tu escuela?")) return;
    const button = event.currentTarget; button.disabled = true;
    try {
      const response = await fetch(BASE + "/" + selectedSchool + "/media/" + tipo, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token() }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo retirar la imagen");
      mostrarMarca(data.escuela.branding);
      notify("Imagen retirada");
    } catch (error) { notify(error.message); }
    finally { button.disabled = false; }
  });
}
$("salir").addEventListener("click", () => { logout(); notify("Sesión cerrada"); });
if (token()) load().catch(e => { logout(); notify(e.message); });
})();
