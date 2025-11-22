/* ============================================================
   VARIABLES GLOBALES
============================================================ */
let avisoSeleccionado = null;

/* ============================================================
   LOGOUT
============================================================ */
function logout() {
    localStorage.clear();
    window.location.href = "../index.html";
}

/* ============================================================
   CARGAR CATEGORÍAS
============================================================ */
async function cargarCategorias() {
    try {
        const res = await fetch(`${BASE_URL}/api/categorias`);
        const categorias = await res.json();

        const filtro = document.getElementById("filtroCategoria");
        const modal = document.getElementById("avisoCategoria");

        categorias.forEach(c => {
            filtro.innerHTML += `<option value="${c._id}">${c.nombre}</option>`;
            modal.innerHTML += `<option value="${c._id}">${c.nombre}</option>`;
        });

    } catch (err) {
        console.error("Error cargando categorías:", err);
    }
}

/* ============================================================
   🔵 CARGAR ENTRENADORES (para ESPECÍFICO)
============================================================ */
async function cargarEntrenadoresEspecifico() {
    const select = document.getElementById("avisoEntrenadorId");
    select.innerHTML = `<option value="">Seleccione un entrenador…</option>`;

    const res = await fetch(`${BASE_URL}/api/entrenadores/listar`);
    const lista = await res.json();

    lista.forEach(e => {
        select.innerHTML += `<option value="${e._id}">${e.nombre}</option>`;
    });
}

/* ============================================================
   🔵 CARGAR JUGADORES + APODERADO
============================================================ */
async function cargarJugadoresApoderado() {
    const select = document.getElementById("avisoJugadorId");
    select.innerHTML = `<option value="">Seleccione un jugador…</option>`;

    const res = await fetch(`${BASE_URL}/api/jugadores/listar`);
    const lista = await res.json();

    lista.forEach(j => {
        select.innerHTML += `
            <option value="${j._id}">
                ${j.nombre}(Apoderado: ${j.apoderado.nombre})
            </option>`;
    });
}

/* ============================================================
   🔥 MOSTRAR SELECT SEGÚN DESTINATARIO
============================================================ */
function mostrarSeleccionEspecifica() {
    const dest = document.getElementById("avisoDestinatario").value;

    const bloqueEntr = document.getElementById("bloqueEntrenador");
    const bloqueJugador = document.getElementById("bloqueJugador");

    bloqueEntr.classList.add("hidden");
    bloqueJugador.classList.add("hidden");

    if (dest === "EntrenadorEspecifico") {
        bloqueEntr.classList.remove("hidden");
        cargarEntrenadoresEspecifico();
    }

    if (dest === "ApoderadoEspecifico") {
        bloqueJugador.classList.remove("hidden");
        cargarJugadoresApoderado();
    }
}

/* ============================================================
   CARGAR AVISOS
============================================================ */
async function cargarAvisos() {
    try {
        const tipo = document.getElementById("filtroTipo").value;
        const estado = document.getElementById("filtroEstado").value;
        const destinatarioFiltro = document.getElementById("filtroDestinatario").value;
        const categoriaFiltro = document.getElementById("filtroCategoria").value;
        const buscar = document.getElementById("filtroBuscar").value.trim();

        const params = new URLSearchParams();
        if (tipo) params.append("tipo", tipo);
        if (estado) params.append("estado", estado);
        if (buscar) params.append("q", buscar);

        const res = await fetch(`${BASE_URL}/api/avisos?${params.toString()}`);
        let avisos = await res.json();

        if (destinatarioFiltro) {
            avisos = avisos.filter(a =>
                a.destinatario === "Todos" ||
                a.destinatario === destinatarioFiltro
            );
        }

        if (categoriaFiltro) {
            avisos = avisos.filter(a => a.categoriaId === categoriaFiltro);
        }

        const tbody = document.getElementById("tbodyAvisos");
        const mensaje = document.getElementById("mensajeSinAvisos");
        tbody.innerHTML = "";

        if (avisos.length === 0) {
            mensaje.classList.remove("hidden");
            return;
        }

        mensaje.classList.add("hidden");

        avisos.forEach(a => {
            const fechaEvento = a.fechaEvento
                ? new Date(a.fechaEvento).toLocaleDateString("es-CL")
                : "—";

            const badgeEstado = `
                <span class="px-2 py-1 rounded text-white ${
                    a.estado === "Vigente" ? "bg-green-600" : "bg-gray-500"
                }">
                    ${a.estado}
                </span>
            `;

            tbody.innerHTML += `
                <tr class="border-b">
                    <td class="p-2 font-bold">${a.titulo}</td>
                    <td class="p-2">${a.tipo}</td>
                    <td class="p-2">${a.destinatario}</td>
                    <td class="p-2">${fechaEvento}</td>
                    <td class="p-2">${badgeEstado}</td>
                    <td class="p-2 flex gap-2">
                        <button onclick="abrirModalAviso('${a._id}')"
                            class="bg-yellow-600 text-white px-2 py-1 rounded text-sm hover:bg-yellow-700">
                            Editar
                        </button>

                        <button onclick="eliminarAviso('${a._id}')"
                            class="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700">
                            Eliminar
                        </button>
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
   ABRIR MODAL
============================================================ */
async function abrirModalAviso(id = null) {
    avisoSeleccionado = id;

    const tituloModal = document.getElementById("tituloModalAviso");

    const inputId = document.getElementById("avisoId");
    const inputTitulo = document.getElementById("avisoTitulo");
    const selectTipo = document.getElementById("avisoTipo");
    const selectDest = document.getElementById("avisoDestinatario");
    const inputFecha = document.getElementById("avisoFechaEvento");
    const textareaContenido = document.getElementById("avisoContenido");
    const selectEstado = document.getElementById("avisoEstado");
    const selectCategoria = document.getElementById("avisoCategoria");

    const selEnt = document.getElementById("avisoEntrenadorId");
    const selJugador = document.getElementById("avisoJugadorId");

    inputId.value = "";
    inputTitulo.value = "";
    selectTipo.value = "General";
    selectDest.value = "Todos";
    inputFecha.value = "";
    textareaContenido.value = "";
    selectEstado.value = "Vigente";
    selectCategoria.value = "";

    document.getElementById("bloqueEntrenador").classList.add("hidden");
    document.getElementById("bloqueJugador").classList.add("hidden");

    if (!id) {
        tituloModal.innerText = "Nuevo aviso";
        mostrarSeleccionEspecifica();
    } else {
        tituloModal.innerText = "Editar aviso";

        const res = await fetch(`${BASE_URL}/api/avisos`);
        const avisos = await res.json();
        const aviso = avisos.find(a => a._id === id);
        if (!aviso) return alert("Aviso no encontrado.");

        inputId.value = aviso._id;
        inputTitulo.value = aviso.titulo;
        selectTipo.value = aviso.tipo;
        selectDest.value = aviso.destinatario;
        selectCategoria.value = aviso.categoriaId || "";
        inputFecha.value = aviso.fechaEvento ? aviso.fechaEvento.split("T")[0] : "";
        textareaContenido.value = aviso.contenido;
        selectEstado.value = aviso.estado;

        mostrarSeleccionEspecifica();

        if (aviso.destinatario === "EntrenadorEspecifico") {
            await cargarEntrenadoresEspecifico();
            selEnt.value = aviso.destinatarioId || "";
        }

        if (aviso.destinatario === "ApoderadoEspecifico") {
            await cargarJugadoresApoderado();
            selJugador.value = aviso.destinatarioId || "";
        }
    }

    document.getElementById("modalAviso").classList.remove("hidden");
}

/* ============================================================
   CERRAR MODAL
============================================================ */
function cerrarModalAviso() {
    document.getElementById("modalAviso").classList.add("hidden");
}

/* ============================================================
   GUARDAR AVISO
============================================================ */
async function guardarAviso() {
    const id = document.getElementById("avisoId").value || avisoSeleccionado;

    const seleccionadoDestinatario = document.getElementById("avisoDestinatario").value;
    let destinatarioId = null;

    if (seleccionadoDestinatario === "EntrenadorEspecifico") {
        destinatarioId = document.getElementById("avisoEntrenadorId").value;
    }

    if (seleccionadoDestinatario === "ApoderadoEspecifico") {
        destinatarioId = document.getElementById("avisoJugadorId").value;
    }

    const payload = {
        titulo: document.getElementById("avisoTitulo").value.trim(),
        contenido: document.getElementById("avisoContenido").value.trim(),
        tipo: document.getElementById("avisoTipo").value,
        destinatario: seleccionadoDestinatario,
        destinatarioId,
        categoriaId: document.getElementById("avisoCategoria").value || null,
        fechaEvento: document.getElementById("avisoFechaEvento").value || null,
        estado: document.getElementById("avisoEstado").value
    };

    if (!payload.titulo || !payload.contenido)
        return alert("Debes ingresar título y contenido.");

    let url =  `${BASE_URL}/api/avisos`;
    let method = "POST";

    if (id) {
        url += `/${id}`;
        method = "PUT";
    }

    const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.error) return alert("❌ " + data.error);

    alert(id ? "✔ Aviso actualizado correctamente" : "✔ Aviso creado correctamente");

    cerrarModalAviso();
    cargarAvisos();
}

/* ============================================================
   ELIMINAR AVISO
============================================================ */
async function eliminarAviso(id) {
    if (!confirm("¿Seguro que deseas eliminar este aviso?")) return;

    const res = await fetch(`${BASE_URL}/api/avisos/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.error) return alert("❌ " + data.error);

    alert("✔ Aviso eliminado.");
    cargarAvisos();
}

/* ============================================================
   SOCKET.IO
============================================================ */
if (typeof io !== "undefined") {
    const socket = io(BASE_URL);
    socket.on("nuevo-aviso", aviso => {
        console.log("📩 Aviso recibido en tiempo real:", aviso);
        cargarAvisos();
    });
}

/* ============================================================
   EVENTOS
============================================================ */
document.getElementById("filtroTipo").addEventListener("change", cargarAvisos);
document.getElementById("filtroEstado").addEventListener("change", cargarAvisos);
document.getElementById("filtroDestinatario").addEventListener("change", cargarAvisos);
document.getElementById("filtroCategoria").addEventListener("change", cargarAvisos);
document.getElementById("filtroBuscar").addEventListener("input", cargarAvisos);

/* ============================================================
   INICIO
============================================================ */
cargarCategorias();
cargarAvisos();
