// =====================================================
// CONFIGURACIÓN GENERAL
// =====================================================
const API_BASE = `${BASE_URL}/api`;

const entrenadorId = localStorage.getItem("idEntrenador");
const categoriaId =
  localStorage.getItem("categoria") ||
  localStorage.getItem("categoriaEntrenador") ||
  localStorage.getItem("categoriaId");

let nombreCategoria = "Mi categoría";

async function obtenerJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Error HTTP ${resp.status} en ${url}`);
  return resp.json();
}

// =====================================================
// CARGAR NOMBRE DE LA CATEGORÍA DEL ENTRENADOR
// =====================================================
async function cargarCategoriaEntrenador() {
  const select = document.getElementById("reporteCategoria");
  if (!select || !categoriaId) return;

  try {
    const categorias = await obtenerJSON(`${API_BASE}/categorias`);
    const cat = categorias.find((c) => String(c._id) === String(categoriaId));
    nombreCategoria = cat ? cat.nombre : "Mi categoría";

    select.innerHTML = `<option value="${categoriaId}">${nombreCategoria}</option>`;
    select.disabled = true;
  } catch (err) {
    console.error("Error cargando categoría del entrenador:", err);
    select.innerHTML = `<option value="">(Error al cargar)</option>`;
  }
}

// =====================================================
// FUNCIÓN PRINCIPAL PARA GENERAR REPORTE
// =====================================================
async function generarReporte() {
  const tipo = document.getElementById("tipoReporte").value;
  const mes = parseInt(document.getElementById("reporteMes").value) || null;
  const anyo = parseInt(document.getElementById("reporteAnyo").value) || null;

  const cont = document.getElementById("contenedorReporte");

  if (!tipo) {
    cont.innerHTML = `<p class="text-gray-500">Seleccione un tipo de reporte.</p>`;
    return;
  }

  cont.innerHTML = `<p class="text-gray-500">Generando reporte...</p>`;

  try {
    if (tipo === "jugadores") {
      await generarReporteJugadores({ cont });
    } else if (tipo === "asistencia") {
      await generarReporteAsistencia({ mes, anyo, cont });
    } else if (tipo === "rendimiento") {
      await generarReporteRendimiento({ cont });
    }
  } catch (err) {
    console.error("Error generando reporte:", err);
    cont.innerHTML = `<p class="text-red-600">Ocurrió un error al generar el reporte.</p>`;
  }
}

// =====================================================
// REPORTE – JUGADORES + APODERADO (SOLO MI CATEGORÍA)
// =====================================================
async function generarReporteJugadores({ cont }) {
  if (!categoriaId) {
    cont.innerHTML = `<p class="text-red-600">No se encontró la categoría del entrenador.</p>`;
    return;
  }

  const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);

  const filtrados = jugadores.filter(
    (j) => j.categoria && String(j.categoria._id) === String(categoriaId)
  );

  if (!filtrados.length) {
    cont.innerHTML = `<p class="text-gray-500">No hay jugadores registrados en tu categoría.</p>`;
    return;
  }

  const filas = filtrados
    .map((j) => {
      const apo = j.apoderado || {};

      // Intentamos varios posibles nombres para el teléfono del apoderado
      const telefonoApoderado =
        apo.telefono ||
        apo.celular ||
        apo.fono ||
        apo.telefonoApoderado ||
        apo.celularApoderado ||
        "—";

      return `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2">${j.nombre}</td>
            <td class="p-2">${j.rut || "—"}</td>
            <td class="p-2">${apo.nombre || "—"}</td>
            <td class="p-2">${apo.correo || "—"}</td>
            <td class="p-2">${telefonoApoderado}</td>
        </tr>`;
    })
    .join("");

  cont.innerHTML = `
    <h3 class="text-lg font-bold mb-2">Listado de jugadores y apoderados (${nombreCategoria})</h3>
    <div class="overflow-x-auto max-h-[400px] border rounded bg-white shadow">
        <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
                <tr>
                    <th class="p-2 text-left">Jugador</th>
                    <th class="p-2 text-left">RUT</th>
                    <th class="p-2 text-left">Apoderado</th>
                    <th class="p-2 text-left">Correo apoderado</th>
                    <th class="p-2 text-left">Teléfono apoderado</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>
    </div>
  `;
}

// =====================================================
// REPORTE – ASISTENCIA POR JUGADOR (SOLO MI CATEGORÍA)
// =====================================================
async function generarReporteAsistencia({ mes, anyo, cont }) {
  if (!categoriaId) {
    cont.innerHTML = `<p class="text-red-600">No se encontró la categoría del entrenador.</p>`;
    return;
  }

  const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);
  const filtrados = jugadores.filter(
    (j) => j.categoria && String(j.categoria._id) === String(categoriaId)
  );

  if (!filtrados.length) {
    cont.innerHTML = `<p class="text-gray-500">No hay jugadores en tu categoría.</p>`;
    return;
  }

  let filas = "";

  for (const j of filtrados) {
    try {
      const asistenciaJugador = await obtenerJSON(
        `${API_BASE}/evento/jugador/${j._id}`
      );

      const listaFiltrada = asistenciaJugador.filter((e) => {
        if (!e.fechaEvento) return false;
        const f = new Date(e.fechaEvento);
        if (mes && f.getMonth() + 1 !== mes) return false;
        if (anyo && f.getFullYear() !== anyo) return false;
        return true;
      });

      const totalEventos = listaFiltrada.length;
      const asistio = listaFiltrada.filter((a) => a.presente).length;
      const falto = totalEventos - asistio;

      const porcentaje =
        totalEventos > 0
          ? ((asistio / totalEventos) * 100).toFixed(1)
          : "0.0";

      filas += `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-2">${j.nombre}</td>
            <td class="p-2">${j.rut || "—"}</td>
            <td class="p-2 text-center">${totalEventos}</td>
            <td class="p-2 text-center">${asistio}</td>
            <td class="p-2 text-center">${falto}</td>
            <td class="p-2 text-center font-semibold">${porcentaje}%</td>
        </tr>
      `;
    } catch (err) {
      console.warn("Error obteniendo asistencia para", j.nombre, err);
    }
  }

  if (!filas) {
    cont.innerHTML = `<p class="text-gray-500">No hay registros de asistencia para este filtro.</p>`;
    return;
  }

  cont.innerHTML = `
    <h3 class="text-lg font-bold mb-2">Reporte de Asistencia (${nombreCategoria})</h3>
    <div class="overflow-x-auto max-h-[400px] border rounded bg-white shadow">
        <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
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
// REPORTE – RENDIMIENTO POR JUGADOR (SOLO MI CATEGORÍA)
// =====================================================
async function generarReporteRendimiento({ cont }) {
  if (!categoriaId) {
    cont.innerHTML = `<p class="text-red-600">No se encontró la categoría del entrenador.</p>`;
    return;
  }

  const jugadores = await obtenerJSON(`${API_BASE}/jugadores/listar`);
  const filtrados = jugadores.filter(
    (j) => j.categoria && String(j.categoria._id) === String(categoriaId)
  );

  if (!filtrados.length) {
    cont.innerHTML = `<p class="text-gray-500">No hay jugadores en tu categoría.</p>`;
    return;
  }

  const resultados = [];

  for (const jugador of filtrados) {
    try {
      const stats = await obtenerJSON(
        `${API_BASE}/evento/jugador/${jugador._id}/stats`
      );

      resultados.push({
        nombre: jugador.nombre,
        rut: jugador.rut,
        totalEventos: stats.totalEventos,
        porcentaje: stats.porcentaje,
        goles: stats.goles,
        asistenciasGol: stats.asistenciasGol,
        pasesClave: stats.pasesClave,
        recuperaciones: stats.recuperaciones,
        tirosArco: stats.tirosArco,
        faltasCometidas: stats.faltasCometidas,
        faltasRecibidas: stats.faltasRecibidas,
        amarillas: stats.amarillas,
        rojas: stats.rojas,
      });
    } catch (err) {
      console.warn("Jugador sin estadísticas:", jugador.nombre, err);
    }
  }

  if (!resultados.length) {
    cont.innerHTML = `<p class="text-gray-500">No hay registros de rendimiento.</p>`;
    return;
  }

  const filas = resultados
    .map(
      (r) => `
    <tr class="border-b text-sm hover:bg-gray-50">
        <td class="p-2 font-semibold">${r.nombre}</td>
        <td class="p-2">${r.rut || "—"}</td>
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
    </tr>`
    )
    .join("");

  cont.innerHTML = `
    <h3 class="text-lg font-bold mb-2">Reporte de Rendimiento (${nombreCategoria})</h3>
    <div class="overflow-x-auto max-h-[400px] border rounded bg-white shadow">
        <table class="w-full text-xs md:text-sm">
            <thead class="bg-gray-100 sticky top-0">
                <tr>
                    <th class="p-2">Jugador</th>
                    <th class="p-2">RUT</th>
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
  pdf.save("reporte-categoria.pdf");
}

// =====================================================
// INICIALIZAR
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  await cargarCategoriaEntrenador();
});
