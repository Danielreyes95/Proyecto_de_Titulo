// =====================================================
// CONFIGURACIÓN GENERAL
// =====================================================
const API_BASE = `${BASE_URL}/api`;

let cacheCategorias = null;

async function obtenerJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Error HTTP ${resp.status} en ${url}`);
    return resp.json();
}

// =====================================================
// CARGAR CATEGORÍAS
// =====================================================
async function cargarCategoriasReporte() {
    const select = document.getElementById("reporteCategoria");
    if (!select) return;

    try {
        if (!cacheCategorias) {
            cacheCategorias = await obtenerJSON(`${API_BASE}/categorias`);
        }

        select.innerHTML = `<option value="">Toda la escuela</option>`;

        cacheCategorias.forEach(c => {
            select.innerHTML += `<option value="${c._id}">${c.nombre}</option>`;
        });

    } catch (err) {
        console.error("Error cargando categorías:", err);
        select.innerHTML = `<option value="">(Error al cargar)</option>`;
    }
}

// =====================================================
// TARJETA – Total Jugadores
// =====================================================
async function cargarTotalJugadores() {
    const el = document.getElementById("repTotalJugadores");
    try {
        const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);
        el.textContent = jugadores.length;
    } catch {
        el.textContent = "—";
    }
}

// =====================================================
// TARJETA – Total Entrenadores
// =====================================================
async function cargarTotalEntrenadores() {
    const el = document.getElementById("repTotalEntrenadores");
    try {
        const entrenadores = await obtenerJSON(`${API_BASE}/entrenadores/listar`);
        el.textContent = entrenadores.length;
    } catch {
        el.textContent = "—";
    }
}

// =====================================================
// TARJETA – Pagos al día
// =====================================================
async function cargarPagosAlDia() {
    const el = document.getElementById("repPagosDia");

    try {
        const hoy = new Date();
        const mes = hoy.getMonth() + 1;
        const year = hoy.getFullYear();

        const resp = await obtenerJSON(
            `${API_BASE}/pagos/reportes?mes=${mes}&anyo=${year}`
        );

        const detalle = Array.isArray(resp.detalle) ? resp.detalle : [];

        const pagados = detalle.filter(p =>
            (p.estado || p.estadoPago || "").toLowerCase() === "pagado"
        ).length;

        const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);
        el.textContent = `${pagados}/${jugadores.length}`;

    } catch (err) {
        console.error("Error pagos al día:", err);
        el.textContent = "—";
    }
}

// =====================================================
// TARJETA – Asistencia Mensual 
// =====================================================
async function cargarAsistenciaMensual() {
    const el = document.getElementById("repAsistenciaMensual");
    if (!el) return;

    try {
        // Cargar categorías si aún no están en memoria
        if (!cacheCategorias) {
            cacheCategorias = await obtenerJSON(`${API_BASE}/categorias`);
        }

        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const yearActual = hoy.getFullYear();

        let sumaPorcentajes = 0;
        let cantidadEventos = 0;

        // 🔥 Obtener eventos de TODA la escuela (todas las categorías)
        for (const cat of cacheCategorias) {

            let eventos = await obtenerJSON(`${API_BASE}/evento/categoria/${cat._id}`);

            // 🔥 Filtrar: solo eventos cerrados del mes actual
            const eventosMes = eventos.filter(ev => {
                const f = new Date(ev.fechaEvento);
                return (
                    ev.cerrado === true &&
                    f.getMonth() === mesActual &&
                    f.getFullYear() === yearActual
                );
            });

            // 🔥 Calcular porcentaje de cada evento cerrado
            eventosMes.forEach(ev => {
                const total = ev.asistencia?.length || 0;
                const presentes = ev.asistencia?.filter(a => a.presente).length || 0;

                if (total > 0) {
                    const porc = (presentes * 100) / total;
                    sumaPorcentajes += porc;
                    cantidadEventos++;
                }
            });
        }

        // -----------------------------
        // 🔥 CALCULAR PROMEDIO MENSUAL
        // -----------------------------
        let promedio = 0;

        if (cantidadEventos > 0) {
            promedio = Number((sumaPorcentajes / cantidadEventos).toFixed(1));
        }

        el.textContent = `${promedio}%`;

    } catch (err) {
        console.error("Error asistencia mensual:", err);
        el.textContent = "—%";
    }
}


// =====================================================
// 🎯 FUNCIÓN PRINCIPAL PARA GENERAR REPORTE
// =====================================================
async function generarReporte() {
    const tipo = document.getElementById("tipoReporte").value;
    const mes = parseInt(document.getElementById("reporteMes").value) || null;
    const anyo = parseInt(document.getElementById("reporteAnyo").value) || null;
    const categoriaId = document.getElementById("reporteCategoria").value || null;

    const cont = document.getElementById("contenedorReporte");

    if (!tipo) {
        cont.innerHTML = `<p class="text-gray-500">Seleccione un tipo de reporte.</p>`;
        return;
    }

    cont.innerHTML = `<p class="text-gray-500">Generando reporte...</p>`;

    try {
        if (tipo === "pagos") {
            await generarReportePagos({ mes, anyo, categoriaId, cont });

        } else if (tipo === "jugadores") {
            await generarReporteJugadores({ categoriaId, cont });

        } else if (tipo === "asistencia") {
            await generarReporteAsistencia({ categoriaId, mes, anyo, cont });

        } else if (tipo === "rendimiento") {
            await generarReporteRendimiento({ categoriaId, cont });
        }

    } catch (err) {
        console.error("Error generando reporte:", err);
        cont.innerHTML = `<p class="text-red-600">Ocurrió un error al generar el reporte.</p>`;
    }
}

// =====================================================
// REPORTE – PAGOS
// =====================================================
async function obtenerPagosEscuela(categoriaId, mes, anyo) {
    let url = `${API_BASE}/pagos/reportes?`;

    if (categoriaId) url += `categoriaId=${categoriaId}&`;
    if (mes) url += `mes=${mes}&`;
    if (anyo) url += `anyo=${anyo}&`;

    const resp = await obtenerJSON(url);
    return Array.isArray(resp.detalle) ? resp.detalle : [];
}

async function generarReportePagos({ mes, anyo, categoriaId, cont }) {
    let pagos = await obtenerPagosEscuela(categoriaId, mes, anyo);

    if (!pagos.length) {
        cont.innerHTML = `<p class="text-gray-500">No hay pagos para este filtro.</p>`;
        return;
    }

    pagos = pagos.map(p => ({
        nombre: p.jugador?.nombre || p.nombre || "Jugador",
        estado: (p.estado || p.estadoPago || "").toLowerCase(),
        monto: p.monto,
        mes: p.mes,
    }));

    const filas = pagos.map(p => `
        <tr class="border-b">
            <td class="p-2">${p.nombre}</td>
            <td class="p-2 capitalize">${p.estado}</td>
            <td class="p-2">${p.monto ? "$" + p.monto.toLocaleString("es-CL") : "-"}</td>
            <td class="p-2">${p.mes || "-"}</td>
        </tr>
    `).join("");

    cont.innerHTML = `
        <h3 class="text-lg font-bold mb-2">Reporte de Pagos</h3>
        <div class="overflow-x-auto max-h-[350px] border rounded bg-white">
            <table class="w-full text-sm">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-2 text-left">Jugador</th>
                        <th class="p-2 text-left">Estado</th>
                        <th class="p-2 text-left">Monto</th>
                        <th class="p-2 text-left">Mes</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

// =====================================================
// REPORTE – JUGADORES
// =====================================================
async function generarReporteJugadores({ categoriaId, cont }) {
    const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);

    const filtrados = categoriaId
        ? jugadores.filter(j => j.categoria?._id === categoriaId)
        : jugadores;

    if (!filtrados.length) {
        cont.innerHTML = `<p class="text-gray-500">No hay jugadores registrados.</p>`;
        return;
    }

    const filas = filtrados
        .map(j => `
            <tr class="border-b">
                <td class="p-2">${j.nombre}</td>
                <td class="p-2">${j.rut}</td>
                <td class="p-2">${j.categoria?.nombre || "Sin categoría"}</td>
                <td class="p-2">${j.estado}</td>
            </tr>
        `)
        .join("");

    cont.innerHTML = `
        <h3 class="text-lg font-bold mb-2">Reporte de Jugadores</h3>
        <div class="overflow-x-auto max-h-[350px] border rounded bg-white">
            <table class="w-full text-sm">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-2">Nombre</th>
                        <th class="p-2">RUT</th>
                        <th class="p-2">Categoría</th>
                        <th class="p-2">Estado</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

// =====================================================
// REPORTE – ASISTENCIA POR JUGADOR
// =====================================================
async function generarReporteAsistencia({ categoriaId, mes, anyo, cont }) {

    if (!cacheCategorias) {
        cacheCategorias = await obtenerJSON(`${API_BASE}/categorias`);
    }

    const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);

    const filtrados = categoriaId
        ? jugadores.filter(j => j.categoria?._id === categoriaId)
        : jugadores;

    if (!filtrados.length) {
        cont.innerHTML = `<p class="text-gray-500">No hay jugadores para este filtro.</p>`;
        return;
    }

    let eventos = [];

    if (categoriaId) {
        eventos = await obtenerJSON(`${API_BASE}/evento/categoria/${categoriaId}`);
    } else {
        // traer todos los eventos de todas las categorías
        for (const cat of cacheCategorias) {
            const ev = await obtenerJSON(`${API_BASE}/evento/categoria/${cat._id}`);
            eventos.push(...ev);
        }
    }

    if (!eventos.length) {
        cont.innerHTML = `<p class="text-gray-500">No existen eventos registrados aún.</p>`;
        return;
    }

    let filas = "";

    for (const j of filtrados) {
        const asistenciaJugador = await obtenerJSON(`${API_BASE}/evento/jugador/${j._id}`);

        const totalEventos = asistenciaJugador.length;
        const asistio = asistenciaJugador.filter(a => a.presente).length;
        const falto = totalEventos - asistio;

        const porcentaje = totalEventos > 0
            ? ((asistio / totalEventos) * 100).toFixed(1)
            : "0";

        filas += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-2">${j.nombre}</td>
                <td class="p-2">${j.rut}</td>
                <td class="p-2 text-center">${totalEventos}</td>
                <td class="p-2 text-center">${asistio}</td>
                <td class="p-2 text-center">${falto}</td>
                <td class="p-2 text-center font-semibold">${porcentaje}%</td>
            </tr>
        `;
    }

    cont.innerHTML = `
        <h3 class="text-lg font-bold mb-2">Reporte de Asistencia por Jugador</h3>
        <div class="overflow-x-auto max-h-[400px] border rounded bg-white shadow">
            <table class="w-full text-sm">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="p-2 text-left">Jugador</th>
                        <th class="p-2 text-left">RUT</th>
                        <th class="p-2 text-center">Total eventos</th>
                        <th class="p-2 text-center">Asistió</th>
                        <th class="p-2 text-center">Faltó</th>
                        <th class="p-2 text-center">% Asistencia</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

// =====================================================
// REPORTE – RENDIMIENTO
// =====================================================
async function generarReporteRendimiento({ categoriaId, cont }) {
    const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);

    const filtrados = categoriaId
        ? jugadores.filter(j => j.categoria?._id === categoriaId)
        : jugadores;

    if (!filtrados.length) {
        cont.innerHTML = `<p class="text-gray-500">No hay jugadores registrados para este filtro.</p>`;
        return;
    }

    const resultados = [];

    for (const jugador of filtrados) {
        try {
            const stats = await obtenerJSON(`${API_BASE}/evento/jugador/${jugador._id}/stats`);

            resultados.push({
                nombre: jugador.nombre,
                rut: jugador.rut,
                categoria: jugador.categoria?.nombre || "Sin categoría",
                totalEventos: stats.totalEventos,
                asistio: stats.asistio,
                falto: stats.falto,
                porcentaje: stats.porcentaje,
                goles: stats.goles,
                asistenciasGol: stats.asistenciasGol,
                pasesClave: stats.pasesClave,
                recuperaciones: stats.recuperaciones,
                tirosArco: stats.tirosArco,
                faltasCometidas: stats.faltasCometidas,
                faltasRecibidas: stats.faltasRecibidas,
                amarillas: stats.amarillas,
                rojas: stats.rojas
            });

        } catch {
            console.warn("Jugador sin estadísticas");
        }
    }

    if (!resultados.length) {
        cont.innerHTML = `<p class="text-gray-500">No hay registros de rendimiento.</p>`;
        return;
    }

    const filas = resultados.map(r => `
        <tr class="border-b text-sm">
            <td class="p-2 font-semibold">${r.nombre}</td>
            <td class="p-2">${r.rut}</td>
            <td class="p-2">${r.categoria}</td>
            <td class="p-2">${r.porcentaje}%</td>
            <td class="p-2">${r.goles}</td>
            <td class="p-2">${r.asistenciasGol}</td>
            <td class="p-2">${r.pasesClave}</td>
            <td class="p-2">${r.recuperaciones}</td>
            <td class="p-2">${r.tirosArco}</td>
            <td class="p-2">${r.faltasCometidas}</td>
            <td class="p-2">${r.faltasRecibidas}</td>
            <td class="p-2">${r.amarillas}</td>
            <td class="p-2">${r.rojas}</td>
        </tr>
    `).join("");

    cont.innerHTML = `
        <h3 class="text-lg font-bold mb-2">Reporte de Rendimiento</h3>
        <div class="overflow-x-auto max-h-[350px] border rounded bg-white">
            <table class="w-full text-sm">
                <thead class="bg-gray-100 sticky top-0">
                    <tr>
                        <th class="p-2">Jugador</th>
                        <th class="p-2">RUT</th>
                        <th class="p-2">Categoría</th>
                        <th class="p-2">% Asistencia</th>
                        <th class="p-2">Goles</th>
                        <th class="p-2">Asist.</th>
                        <th class="p-2">Pases clave</th>
                        <th class="p-2">Recuperaciones</th>
                        <th class="p-2">Tiros</th>
                        <th class="p-2">Faltas Comet.</th>
                        <th class="p-2">Faltas Rec.</th>
                        <th class="p-2">Amarillas</th>
                        <th class="p-2">Rojas</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>
    `;
}

// =====================================================
// PDF
// =====================================================
async function descargarPDF() {
    const cont = document.getElementById("contenedorReporte");
    const { jsPDF } = window.jspdf;

    const canvas = await html2canvas(cont);
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save("reporte.pdf");
}

// =====================================================
// INICIALIZAR
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
    await cargarCategoriasReporte();
    await cargarTotalJugadores();
    await cargarTotalEntrenadores();
    await cargarPagosAlDia();
    await cargarAsistenciaMensual(); 
});

// LOGOUT
function logout() {
    localStorage.clear();
    window.location.href = "../index.html";
}
