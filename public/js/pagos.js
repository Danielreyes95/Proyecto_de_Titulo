/* =====================================================
   VARIABLES GLOBALES
===================================================== */
let jugadorSeleccionado = null;
let anioIns = null;
let mesIns = null;

/* =====================================================
   LOGOUT
===================================================== */
function logout() {
    localStorage.clear();
    window.location.href = "../index.html";
}

/* =====================================================
   Normalizar meses defectuosos del backend
   (Ej: "Noviembre 2025 2025")
===================================================== */
function normalizarMes(mesStr) {
    if (!mesStr) return "";
    const partes = mesStr.trim().split(" ");

    if (partes.length === 3) {
        return `${partes[0]} ${partes[1]}`;
    }
    return mesStr;
}

/* =====================================================
   CARGAR CATEGORÍAS PARA FILTRO
===================================================== */
async function cargarCategoriasFiltro() {
    const res = await fetch(`${BASE_URL}/api/categorias`);
    const categorias = await res.json();

    const select = document.getElementById("filtroCategoria");
    select.innerHTML = `<option value="">Todas</option>`;

    categorias.forEach(c => {
        select.innerHTML += `<option value="${c._id}">${c.nombre}</option>`;
    });
}

/* =====================================================
   CARGAR MES ACTUAL
===================================================== */
function cargarMesActual() {
    const hoy = new Date();
    const mes = hoy.getFullYear() + "-" + String(hoy.getMonth() + 1).padStart(2, "0");
    document.getElementById("filtroMes").value = mes;
}

/* =====================================================
   FORMATO CLP
===================================================== */
function clp(num) {
    return new Intl.NumberFormat("es-CL").format(num);
}

/* =====================================================
   CONVERTIR MES A FORMATO COMPLETO
===================================================== */
function convertirMes(mesInput) {
    const [anio, mesNum] = mesInput.split("-");
    const MESES = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    return `${MESES[Number(mesNum) - 1]} ${anio}`;
}

function convertirMesJugador(valor) {
    const [anio, mesNum] = valor.split("-");
    const MESES = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    return `${MESES[Number(mesNum) - 1]} ${anio}`;
}

/* =====================================================
   CARGAR PAGOS (DIRECTOR)
===================================================== */
async function cargarPagos() {

    const categoria = document.getElementById("filtroCategoria").value;
    const mesInput = document.getElementById("filtroMes").value;
    const estadoFiltro = document.getElementById("filtroEstado").value;
    const search = document.getElementById("filtroBuscar").value.toLowerCase();

    if (!mesInput) return;

    const mes = convertirMes(mesInput);

    const res = await fetch(
        `${BASE_URL}/api/pagos/resumen?mes=${encodeURIComponent(mes)}&categoriaId=${categoria}`
    );

    const data = await res.json();
    const tbody = document.getElementById("tbodyPagos");

    tbody.innerHTML = "";

    // Copiamos jugadores
    let lista = data.jugadores.map(j => ({ ...j }));

    /* =====================================================
       1. FILTRAR POR FECHA DE INSCRIPCIÓN
       Jugadores inscritos DESPUÉS del mes → fuera
       (usamos último día del mes filtrado)
    ====================================================== */
    const [anioStr, mesStr] = mesInput.split("-");
    const anioNum = Number(anioStr);
    const mesNum = Number(mesStr); // 1–12
    const fechaFinMes = new Date(anioNum, mesNum, 0); // día 0 del siguiente mes = último día

    lista = lista.filter(j => {
        if (!j.createdAt) return true; // por seguridad
        const fechaIns = new Date(j.createdAt);
        return fechaIns <= fechaFinMes;
    });

    /* =====================================================
       2. REGLAS DE ESTADO SEGÚN MES (ANTES de filtros):
          - Mes < mes actual  → Atrasado (si no está pagado)
          - Mes = mes actual  → Pendiente / Pagado según backend
          - Mes > mes actual  → Pendiente (salvo pago adelantado = Pagado)
    ====================================================== */

    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1; // 1–12

    // Recalcular estados y totales en base a la lista filtrada
    let pagados = 0;
    let pendientes = 0;
    let atrasados = 0;
    let montoTotal = 0;

    lista = lista.map(j => {
        let estadoFinal;

        // Si hay pago asociado, es Pagado sin importar el mes (adelantado o al día)
        if (j.pagoId) {
            estadoFinal = "Pagado";
        } else {
            // No tiene pago, aplicamos reglas temporales
            if (anioNum < anioActual || (anioNum === anioActual && mesNum < mesActual)) {
                // Mes anterior al actual
                estadoFinal = "Atrasado";
            } else {
                // Mes actual o futuro sin pago → Pendiente
                estadoFinal = "Pendiente";
            }
        }

        // Recalcular totales
        if (estadoFinal === "Pagado") {
            pagados++;
            montoTotal += j.monto || 0;
        } else if (estadoFinal === "Atrasado") {
            atrasados++;
        } else {
            pendientes++;
        }

        return {
            ...j,
            estadoPago: estadoFinal
        };
    });

    /* =====================================================
       3. APLICAR FILTROS DE ESTADO Y BUSCADOR
    ====================================================== */
    lista = lista.filter(j =>
        (estadoFiltro === "" || j.estadoPago.toLowerCase() === estadoFiltro) &&
        (
            search === "" ||
            j.nombre.toLowerCase().includes(search) ||
            j.rut.includes(search)
        )
    );

    /* =====================================================
       4. ACTUALIZAR RESUMEN (con la lista filtrada)
    ====================================================== */
    document.getElementById("bloqueResumen").classList.remove("hidden");
    document.getElementById("resPagados").innerText = pagados;
    document.getElementById("resPendientes").innerText = pendientes;
    document.getElementById("resAtrasados").innerText = atrasados;
    document.getElementById("resMonto").innerText = `$${clp(montoTotal)}`;

    /* =====================================================
       5. RENDER DE LA TABLA
    ====================================================== */
    lista.forEach(j => {

        const estadoLower = j.estadoPago.toLowerCase();

        const color = estadoLower === "pagado"
            ? "bg-green-600"
            : estadoLower === "pendiente"
            ? "bg-yellow-500"
            : "bg-red-600";

        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-2">${j.nombre}</td>
                <td class="p-2">${j.rut}</td>

                <td class="p-2">
                    ${j.createdAt ? new Date(j.createdAt).toLocaleDateString("es-CL") : "-"}
                </td>

                <td class="p-2">
                    <span class="px-2 py-1 rounded text-white ${color}">
                        ${j.estadoPago}
                    </span>
                </td>

                <td class="p-2">$${clp(j.monto)}</td>

                <td class="p-2 flex flex-wrap gap-2">

                    <button onclick="abrirModalPago('${j.jugadorId}', '${mesInput}', '${j.nombre}')"
                        class="bg-green-600 text-white px-2 py-1 rounded text-sm">
                        Registrar
                    </button>

                    <button onclick="abrirHistorial('${j.jugadorId}', '${j.nombre}')"
                        class="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                        Historial
                    </button>

                    ${j.pagoId ? `
                        <button onclick="abrirModalEditarPago('${j.pagoId}', '${j.jugadorId}', '${j.nombre}', '${mesInput}')"
                            class="bg-yellow-600 text-white px-2 py-1 rounded text-sm">
                            Editar
                        </button>

                        <button onclick="eliminarPago('${j.pagoId}')"
                            class="bg-red-600 text-white px-2 py-1 rounded text-sm">
                            Eliminar
                        </button>
                    ` : `
                        <span class="text-gray-500 text-sm italic">Sin pago registrado</span>
                    `}
                </td>
            </tr>
        `;
    });
}

/* =====================================================
   MODAL PAGO
===================================================== */
function abrirModalPago(idJugador, mesRaw, nombre) {
    document.getElementById("pagoJugadorId").value = idJugador;
    document.getElementById("pagoMes").value = mesRaw;
    document.getElementById("pagoJugadorNombre").innerText = nombre;

    const [anio, mes] = mesRaw.split("-");
    document.getElementById("pagoMesTexto").innerText = `${mes}-${anio}`;

    document.getElementById("modalPago").classList.remove("hidden");
}

function cerrarModalPago() {
    document.getElementById("modalPago").classList.add("hidden");
}

async function confirmarPago() {

    const jugadorId = document.getElementById("pagoJugadorId").value;
    const mesRaw = document.getElementById("pagoMes").value;
    const metodo = document.getElementById("pagoMetodo").value;
    const obs = document.getElementById("pagoObservacion").value;

    const mesNormalizado = convertirMesJugador(mesRaw);

    let montoStr = document.getElementById("pagoMonto").value;
    montoStr = montoStr.replace(/\D/g, "");
    const monto = Number(montoStr);

    if (!monto || monto <= 0) return alert("Debe ingresar un monto válido.");
    if (!metodo) return alert("Debe seleccionar un método.");

    const res = await fetch(`${BASE_URL}/api/pagos/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jugadorId,
            mes: mesNormalizado,
            monto,
            metodoPago: metodo,
            observacion: obs
        })
    });

    const data = await res.json();

    if (data.error) return alert("Error: " + data.error);

    alert("Pago registrado.");
    cerrarModalPago();
    cargarPagos();
}

/* =====================================================
   EDITAR PAGO
===================================================== */
async function abrirModalEditarPago(pagoId, jugadorId, nombre, mesRaw) {

    jugadorSeleccionado = jugadorId;

    document.getElementById("editarJugadorNombre").innerText = nombre;
    document.getElementById("editarPagoId").value = pagoId;

    const [anio, mes] = mesRaw.split("-");
    document.getElementById("editarMesTexto").innerText = `${mes}-${anio}`;

    const res = await fetch(`${BASE_URL}/api/pagos/jugador/${jugadorSeleccionado}`);
    const wrapper = await res.json();
    const data = wrapper.pagos || [];

    const pago = data.find(p => p._id === pagoId);

    if (!pago) {
        alert("No se pudo cargar la información del pago.");
        return;
    }

    document.getElementById("editarMetodo").value = pago.metodoPago;
    document.getElementById("editarMonto").value = pago.monto;
    document.getElementById("editarObservacion").value = pago.observacion || "";

    document.getElementById("modalEditar").classList.remove("hidden");
}

function cerrarModalEditar() {
    document.getElementById("modalEditar").classList.add("hidden");
}

async function confirmarEdicionPago() {

    const pagoId = document.getElementById("editarPagoId").value;
    const metodo = document.getElementById("editarMetodo").value;
    const monto = document.getElementById("editarMonto").value;
    const obs = document.getElementById("editarObservacion").value;

    const payload = {};

    if (metodo) payload.metodoPago = metodo;
    if (monto !== "") payload.monto = Number(monto);
    if (obs.trim() !== "") payload.observacion = obs;

    if (Object.keys(payload).length === 0)
        return alert("No hay cambios para guardar.");

    const res = await fetch(`${BASE_URL}/api/pagos/editar/${pagoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.error) return alert("Error: " + data.error);

    alert("Pago actualizado.");
    cerrarModalEditar();
    cargarPagos();
}

/* =====================================================
   ELIMINAR PAGO
===================================================== */
async function eliminarPago(pagoId) {

    if (!confirm("¿Eliminar pago definitivamente?")) return;

    const res = await fetch(`${BASE_URL}/api/pagos/eliminar/${pagoId}`, {
        method: "DELETE"
    });

    const data = await res.json();

    if (data.error) return alert("Error: " + data.error);

    alert("Pago eliminado correctamente.");
    cargarPagos();
}

/* =====================================================
   HISTORIAL (MODAL)
===================================================== */
async function abrirHistorial(idJugador, nombre) {

    jugadorSeleccionado = idJugador;
    document.getElementById("histJugadorNombre").innerText = nombre;

    await cargarAniosHistorial(idJugador);

    const anioActual = new Date().getFullYear();
    await cargarHistorial(anioActual);

    document.getElementById("modalHistorial").classList.remove("hidden");
}

function cerrarModalHistorial() {
    document.getElementById("modalHistorial").classList.add("hidden");
}

/* =====================================================
   AÑOS DISPONIBLES PARA HISTORIAL
===================================================== */
async function cargarAniosHistorial(idJugador) {

    const jugadorRes = await fetch(`${BASE_URL}/api/jugadores/${idJugador}`);
    const jugador = await jugadorRes.json();

    const pagosRes = await fetch(`${BASE_URL}/api/pagos/historial/${idJugador}`);
    const pagos = await pagosRes.json();

    const fecha = jugador.createdAt ? new Date(jugador.createdAt) : new Date();
    anioIns = fecha.getFullYear();
    mesIns = fecha.getMonth();

    const select = document.getElementById("selectAnio");
    select.innerHTML = "";

    const aniosPagos = [...new Set(pagos.map(p => Number(normalizarMes(p.mes).split(" ")[1])))];

    const maxAnio = Math.max(anioIns, ...aniosPagos);

    for (let a = anioIns; a <= maxAnio; a++) {
        select.innerHTML += `<option value="${a}">${a}</option>`;
    }

    select.onchange = e => cargarHistorial(Number(e.target.value));
}

/* =====================================================
   CARGAR HISTORIAL POR AÑO
===================================================== */
async function cargarHistorial(anio) {

    const res = await fetch(`${BASE_URL}/api/pagos/historial/${jugadorSeleccionado}`);
    const data = await res.json();

    const mesesCorto = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const mesesLargo = [
        "Enero","Febrero","Marzo","Abril","Mayo","Junio",
        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];

    const tbody = document.getElementById("tbodyHistorial");
    tbody.innerHTML = "";

    for (let m = 0; m < 12; m++) {

        if (anio === anioIns && m < mesIns) continue;

        const pago = data.find(p => {
            const [mesTexto, anioTexto] = normalizarMes(p.mes).split(" ");
            const mesIndex = mesesLargo.indexOf(mesTexto);
            return mesIndex === m && Number(anioTexto) === anio;
        });

        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-2">${mesesCorto[m]}</td>
                <td class="p-2">${pago ? "pagado" : "pendiente"}</td>
                <td class="p-2">${pago?.metodoPago || "—"}</td>
                <td class="p-2">
                    ${pago?.fechaPago ? new Date(pago.fechaPago).toLocaleDateString("es-CL") : "—"}
                </td>
                <td class="p-2">${pago?.observacion || "—"}</td>
            </tr>
        `;
    }
}

/* =====================================================
   EVENTOS
===================================================== */
document.getElementById("filtroCategoria").addEventListener("change", cargarPagos);
document.getElementById("filtroMes").addEventListener("change", cargarPagos);
document.getElementById("filtroEstado").addEventListener("change", cargarPagos);
document.getElementById("filtroBuscar").addEventListener("input", cargarPagos);

/* Inicializar */
cargarCategoriasFiltro();
cargarMesActual();
cargarPagos();

/* =====================================================
   ESCAPE PARA CERRAR MODALES
===================================================== */
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        document.getElementById("modalPago").classList.add("hidden");
        document.getElementById("modalEditar").classList.add("hidden");
        document.getElementById("modalHistorial").classList.add("hidden");
    }
});

/* =====================================================
   FORMATEAR MONTO EN TIEMPO REAL
===================================================== */
function formatearMonto(input) {
    let valor = input.value.replace(/\D/g, "");
    input.value = valor ? Number(valor).toLocaleString("es-CL") : "";
}
