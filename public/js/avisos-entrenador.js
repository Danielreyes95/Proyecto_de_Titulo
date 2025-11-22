/* ============================================================
   CONFIG
============================================================ */
const API = `${BASE_URL}/api`;

// Datos del entrenador desde localStorage
const entrenadorId = localStorage.getItem("idEntrenador");

// Fallback por si antes usaste otros nombres
const categoriaId =
  localStorage.getItem("categoria") ||
  localStorage.getItem("categoriaEntrenador") ||
  localStorage.getItem("categoriaId");

if (!entrenadorId || !categoriaId) {
  console.warn("Entrenador o categoría no encontrados en localStorage", {
    entrenadorId,
    categoriaId,
  });
}

/* ============================================================
   LOGOUT
============================================================ */
function logout() {
  localStorage.clear();
  window.location.href = "../index.html";
}

/* ============================================================
   MOSTRAR / OCULTAR BLOQUE JUGADOR
============================================================ */
function mostrarJugador() {
  const dest = document.getElementById("avisoDestinatario").value;
  const bloque = document.getElementById("bloqueJugador");

  if (dest === "Jugador") {
    bloque.classList.remove("hidden");
    cargarJugadoresDeCategoria();
  } else {
    bloque.classList.add("hidden");
  }
}

/* ============================================================
   CARGAR JUGADORES SOLO DE ESA CATEGORÍA
============================================================ */
async function cargarJugadoresDeCategoria() {
  const select = document.getElementById("avisoJugadorId");
  select.innerHTML = `<option value="">Seleccione un jugador...</option>`;

  try {
    const res = await fetch(`${API}/jugadores/listar`);

    if (!res.ok) {
      const txt = await res.text();
      console.error("Error HTTP al cargar jugadores:", res.status, txt);
      select.innerHTML =
        '<option value="">Error al cargar jugadores</option>';
      return;
    }

    const jugadores = await res.json();

    const filtrados = (Array.isArray(jugadores) ? jugadores : []).filter(
      (j) => j.categoria?._id === categoriaId
    );

    if (!filtrados.length) {
      select.innerHTML =
        '<option value="">No hay jugadores en mi categoría</option>';
      return;
    }

    filtrados.forEach((j) => {
      select.innerHTML += `
        <option value="${j._id}">
          ${j.nombre} (Apoderado: ${j.apoderado?.nombre || "—"})
        </option>`;
    });
  } catch (err) {
    console.error("Error cargando jugadores:", err);
    select.innerHTML =
      '<option value="">Error al cargar jugadores</option>';
  }
}

/* ============================================================
   CARGAR TODOS LOS AVISOS
   (solo puedes eliminar los que TÚ creaste)
============================================================ */
async function cargarAvisos() {
  try {
    const res = await fetch(`${API}/avisos`);
    const json = await res.json();

    // Puede venir como [ ... ] o { avisos: [ ... ] }
    const avisos = Array.isArray(json) ? json : json.avisos || [];

    console.log("Avisos recibidos:", avisos);

    const tbody = document.getElementById("tbodyAvisos");
    const mensaje = document.getElementById("mensajeSinAvisos");
    tbody.innerHTML = "";

    if (!avisos.length) {
      mensaje.classList.remove("hidden");
      return;
    }

    mensaje.classList.add("hidden");

    avisos.forEach((a) => {
      const fecha = a.createdAt
        ? new Date(a.createdAt).toLocaleDateString("es-CL")
        : "—";

      // 🟢 TEXTO DEL DESTINATARIO
      let textoDest = "";

      if (a.destinatarioTexto) {
        // Si el backend ya calculó el texto bonito, lo usamos tal cual
        textoDest = a.destinatarioTexto;
      } else {
        // Fallback por si algún aviso viejo no tiene destinatarioTexto
        switch (a.destinatario) {
          case "Apoderados":
            textoDest = "Todos los apoderados";
            break;
          case "ApoderadoEspecifico":
            textoDest = "Apoderado / jugador específico";
            break;
          case "Entrenadores":
            textoDest = "Entrenadores";
            break;
          case "EntrenadorEspecifico":
            textoDest = "Entrenador específico";
            break;
          case "Todos":
            textoDest = "Todos (apoderados y entrenadores)";
            break;
          default:
            textoDest = a.destinatario || "Destinatario no especificado";
        }
      }

      const avisoJson = encodeURIComponent(JSON.stringify(a));

      // 🔴 Ahora siempre mostramos botón Eliminar
      const btnEliminar = `
        <button onclick="eliminarAviso('${a._id}')"
          class="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700">
          Eliminar
        </button>
      `;

      tbody.innerHTML += `
        <tr class="border-b">
          <td class="p-2 font-bold">${a.titulo}</td>
          <td class="p-2">${fecha}</td>
          <td class="p-2">${textoDest}</td>
          <td class="p-2 flex gap-2">
            <button onclick="verAviso('${avisoJson}')"
              class="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700">
              Ver
            </button>
            ${btnEliminar}
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Error al cargar avisos:", err);
    alert("Error al cargar avisos.");
  }
}

/* ============================================================
   VER AVISO (abre modal de lectura)
============================================================ */
function verAviso(avisoStr) {
  try {
    const aviso = JSON.parse(decodeURIComponent(avisoStr));

    document.getElementById("verAvisoTitulo").innerText = aviso.titulo;
    document.getElementById("verAvisoFecha").innerText = aviso.createdAt
      ? new Date(aviso.createdAt).toLocaleString("es-CL")
      : "—";
    document.getElementById("verAvisoContenido").innerText =
      aviso.contenido || "";

    document
      .getElementById("modalVerAviso")
      .classList.remove("hidden");
  } catch (err) {
    console.error("Error mostrando aviso:", err);
  }
}

function cerrarModalVerAviso() {
  document.getElementById("modalVerAviso").classList.add("hidden");
}

/* ============================================================
   ABRIR / CERRAR MODAL CREAR AVISO
============================================================ */
function abrirModalAviso() {
  document.getElementById("avisoTitulo").value = "";
  document.getElementById("avisoContenido").value = "";
  document.getElementById("avisoDestinatario").value = "Categoria";
  document.getElementById("bloqueJugador").classList.add("hidden");

  document.getElementById("modalAviso").classList.remove("hidden");
}

function cerrarModalAviso() {
  document.getElementById("modalAviso").classList.add("hidden");
}

/* ============================================================
   GUARDAR AVISO
============================================================ */
async function guardarAviso() {
  const titulo = document.getElementById("avisoTitulo").value.trim();
  const contenido = document
    .getElementById("avisoContenido")
    .value.trim();
  const destinatarioSel =
    document.getElementById("avisoDestinatario").value;

  if (!titulo || !contenido)
    return alert("Debes ingresar título y contenido.");

  let destinatarioId = null;
  let destinatario;

  if (destinatarioSel === "Categoria") {
    // Aviso general a TODOS los apoderados de MI categoría
    destinatario = "Apoderados";
  } else {
    // Aviso a un solo jugador (apoderado específico)
    destinatario = "ApoderadoEspecifico";
    destinatarioId = document.getElementById("avisoJugadorId").value;
    if (!destinatarioId) return alert("Seleccione un jugador.");
  }

  const payload = {
    titulo,
    contenido,
    tipo: "General",
    categoriaId,            // categoría del entrenador
    creadorId: entrenadorId, // << se guarda quién creó el aviso
    destinatario,
    destinatarioId,
  };

  try {
    const res = await fetch(`${API}/avisos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      console.error("Error crear aviso:", data);
      return alert("❌ Error al crear aviso.");
    }

    alert("✔ Aviso enviado correctamente");
    cerrarModalAviso();
    cargarAvisos();
  } catch (err) {
    console.error("Error guardando aviso:", err);
    alert("Error al guardar aviso.");
  }
}

/* ============================================================
   ELIMINAR AVISO (solo propios)
============================================================ */
async function eliminarAviso(id) {
  if (!confirm("¿Seguro que deseas eliminar este aviso?")) return;

  try {
    const res = await fetch(`${API}/avisos/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok || data.error) {
      console.error("Error eliminar aviso:", data);
      return alert("❌ Error al eliminar aviso.");
    }

    alert("✔ Aviso eliminado.");
    cargarAvisos();
  } catch (err) {
    console.error("Error eliminando aviso:", err);
    alert("Error al eliminar aviso.");
  }
}

/* ============================================================
   SOCKET.IO (opcional)
============================================================ */
if (typeof io !== "undefined") {
  const socket = io();
  socket.on("nuevo-aviso", (aviso) => {
    console.log("📩 Aviso recibido:", aviso);
    cargarAvisos();
  });
}

/* ============================================================
   INICIO
============================================================ */
cargarAvisos();
