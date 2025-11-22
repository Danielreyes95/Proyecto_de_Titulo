const token = localStorage.getItem("token");
if (!token) window.location.href = "../index.html";

function logout() {
  localStorage.clear();
  window.location.href = "../index.html";
}

document.getElementById("formEventoEntrenador").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    categoriaId: document.getElementById("categoriaId").value,
    tipoEvento: document.getElementById("tipoEvento").value,
    fecha: document.getElementById("fecha").value,
    lugar: document.getElementById("lugar").value
  };

  const res = await fetch(`${BASE_URL}/api/notificaciones/evento`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  const json = await res.json();
  alert(json.mensaje || json.error);
});
async function abrirModalAsistencia(eventoId) {
    try {
        const res = await fetch(`${BASE_URL}/api/evento/${eventoId}`);
        const data = await res.json();

        const asistencia = data.asistencia || [];

        let html = "";

        asistencia.forEach(a => {
            let estado = "";

            if (a.presente === true) {
                estado = `<span class="text-green-600 font-semibold">Asistirá</span>`;
            } else if (a.presente === false) {
                estado = `<span class="text-red-600 font-semibold">No asistirá</span>`;
            } else {
                estado = `<span class="text-yellow-600 font-semibold">Pendiente</span>`;
            }

            html += `
                <tr>
                    <td class="p-2 border">${a.jugador?.nombre || "Jugador"}</td>
                    <td class="p-2 border">${estado}</td>
                </tr>
            `;
        });

        document.getElementById("tablaAsistencia").innerHTML = html;

        document.getElementById("modalAsistencia").classList.remove("hidden");

    } catch (err) {
        console.error("ERROR asistencia:", err);
        alert("No se pudo cargar la asistencia del evento.");
    }
}
function cerrarModalAsistencia() {
    document.getElementById("modalAsistencia").classList.add("hidden");
}
