(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const BASE = "/api/platform";
  let escuelas = [];

  function notify(message, error = false) {
    $("mensaje").textContent = message;
    $("mensaje").classList.toggle("error", error);
  }

  function token() { return sessionStorage.getItem("platformToken"); }

  function loggedIn(isAuthenticated) {
    $("inicioSesion").hidden = isAuthenticated;
    $("administracion").hidden = !isAuthenticated;
    $("salir").hidden = !isAuthenticated;
  }

  function logout() {
    sessionStorage.removeItem("platformToken");
    escuelas = [];
    loggedIn(false);
  }

  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token()) headers.Authorization = `Bearer ${token()}`;
    const response = await fetch(BASE + path, { ...options, headers });
    let result;
    try { result = await response.json(); } catch { result = {}; }
    if (response.status === 401 && path !== "/auth/login") logout();
    if (!response.ok) throw new Error(result.error || `Error HTTP ${response.status}`);
    return result;
  }

  function field(id) { return $(id).value.trim(); }

  function addTextCell(row, text) {
    const cell = row.insertCell();
    cell.textContent = text;
    return cell;
  }

  function pickMarca() {
    const escuela = escuelas.find(x => x._id === $("escuelaMarca").value);
    const b = escuela?.branding || {};
    $("nombrePublico").value = b.nombrePublico || escuela?.nombre || "";
    for (const key of ["colorPrimario", "colorSecundario", "colorAcento", "colorTexto"]) {
      $(key).value = b[key] || ({
        colorPrimario: "#166534", colorSecundario: "#ffffff",
        colorAcento: "#f59e0b", colorTexto: "#111827"
      })[key];
    }
    updatePreview();
  }

  function updatePreview() {
    const preview = $("vistaPrevia");
    preview.style.backgroundColor = $("colorSecundario").value;
    preview.style.color = $("colorTexto").value;
    preview.style.borderColor = $("colorPrimario").value;
    $("previaNombre").textContent = field("nombrePublico") || "Nombre de la escuela";
    const button = $("previaBoton");
    button.style.backgroundColor = $("colorPrimario").value;
    button.style.color = $("colorSecundario").value;
    button.style.borderBottom = `4px solid ${$("colorAcento").value}`;
  }

  async function reload() {
    const data = await request("/escuelas");
    escuelas = data.escuelas || [];
    $("total").textContent = escuelas.length;
    $("activas").textContent = escuelas.filter(x => x.estado === "activa").length;
    $("suspendidas").textContent = escuelas.filter(x => x.estado === "suspendida").length;
    const selected = $("escuelaMarca").value;
    const select = $("escuelaMarca");
    select.replaceChildren();
    const inviteSelect = $("escuelaInvitar");
    inviteSelect.replaceChildren();
    inviteSelect.add(new Option("Seleccionar escuela", ""));
    const blank = new Option("Seleccionar escuela", "");
    select.add(blank);
    const body = $("escuelasBody");
    body.replaceChildren();

    for (const escuela of escuelas) {
      select.add(new Option(escuela.nombre, escuela._id));
      if (escuela.estado === "activa") inviteSelect.add(new Option(escuela.nombre, escuela._id));
      const row = body.insertRow();
      addTextCell(row, escuela.nombre);
      addTextCell(row, escuela.slug);
      const status = addTextCell(row, "");
      const badge = document.createElement("span");
      badge.className = "pildora " + escuela.estado;
      badge.textContent = escuela.estado;
      status.append(badge);
      const actions = row.insertCell();
      const customize = document.createElement("button");
      customize.className = "secundario";
      customize.type = "button";
      customize.textContent = "Personalizar";
      customize.addEventListener("click", () => {
        select.value = escuela._id;
        pickMarca();
        $("marcaForm").scrollIntoView({ behavior: "smooth", block: "center" });
      });
      actions.append(customize);
      if (escuela.estado !== "activa") {
        const activate = document.createElement("button");
        activate.type = "button";
        activate.textContent = "Activar";
        activate.addEventListener("click", () => changeState(escuela, "activa"));
        actions.append(activate);
      } else {
        const suspend = document.createElement("button");
        suspend.type = "button";
        suspend.textContent = "Suspender";
        suspend.addEventListener("click", () => changeState(escuela, "suspendida"));
        actions.append(suspend);
      }
    }
    select.value = escuelas.some(x => x._id === selected) ? selected : "";
    pickMarca();
  }

  async function changeState(escuela, estado) {
    if (!confirm(`¿Cambiar el estado de ${escuela.nombre} a ${estado}?`)) return;
    try {
      await request(`/escuelas/${escuela._id}`, {
        method: "PATCH", body: JSON.stringify({ estado })
      });
      await reload();
      notify("Estado de escuela actualizado");
    } catch (error) { notify(error.message, true); }
  }

  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: field("email"), password: $("password").value })
      });
      sessionStorage.setItem("platformToken", data.token);
      $("password").value = "";
      await reload();
      loggedIn(true);
      notify("Sesión iniciada");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });

  $("crearForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      const school = await request("/escuelas", {
        method: "POST",
        body: JSON.stringify({ nombre: field("nombre"), slug: field("slug") })
      });
      $("crearForm").reset();
      await reload();
      $("escuelaMarca").value = school.escuela._id;
      pickMarca();
      notify("Escuela creada correctamente");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });

  $("invitarForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    try {
      await request(`/escuelas/${$("escuelaInvitar").value}/invitar-director`, {
        method: "POST",
        body: JSON.stringify({
          nombre: field("nombreDirector"),
          email: field("correoDirector")
        })
      });
      $("invitarForm").reset();
      notify("Invitación enviada al correo del director.");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });

  $("marcaForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    const id = $("escuelaMarca").value;
    if (!id) return notify("Selecciona una escuela", true);
    button.disabled = true;
    try {
      await request(`/escuelas/${id}/branding`, {
        method: "PATCH",
        body: JSON.stringify({
          nombrePublico: field("nombrePublico"),
          colorPrimario: $("colorPrimario").value,
          colorSecundario: $("colorSecundario").value,
          colorAcento: $("colorAcento").value,
          colorTexto: $("colorTexto").value
        })
      });
      await reload();
      notify("Identidad visual guardada");
    } catch (error) { notify(error.message, true); }
    finally { button.disabled = false; }
  });

  $("escuelaMarca").addEventListener("change", pickMarca);
  for (const key of ["nombrePublico", "colorPrimario", "colorSecundario",
    "colorAcento", "colorTexto"]) {
    $(key).addEventListener("input", updatePreview);
  }
  $("recargar").addEventListener("click", () =>
    reload().then(() => notify("Lista actualizada")).catch(e => notify(e.message, true)));
  $("salir").addEventListener("click", () => { logout(); notify("Sesión cerrada"); });
  updatePreview();
  if (token()) {
    request("/auth/me").then(() => reload()).then(() => loggedIn(true))
      .catch(() => { logout(); notify("Inicia sesión para continuar", true); });
  }
})();
