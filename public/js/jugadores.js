const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "../index.html";
}

// Cargar jugadores al iniciar
document.addEventListener("DOMContentLoaded", async () => {
  const tabla = document.getElementById("tablaJugadores");

  try {
    const res = await fetch(`${BASE_URL}/api/jugador/listar`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      tabla.innerHTML = `
        <tr>
          <td colspan="4" class="p-3 text-center text-red-600">
            Error al cargar jugadores
          </td>
        </tr>`;
      return;
    }

    data.jugadores.forEach(j => {
      tabla.innerHTML += `
        <tr class="border">
          <td class="p-2 border">${j.nombre}</td>
          <td class="p-2 border">${j.rut}</td>
          <td class="p-2 border">${j.categoria ? j.categoria.nombre : "Sin asignar"}</td>
          <td class="p-2 border">${j.apoderado ? j.apoderado.nombre : "—"}</td>
        </tr>
      `;
    });

  } catch (err) {
    tabla.innerHTML = `
      <tr>
        <td colspan="4" class="p-3 text-center text-red-600">
          Error de conexión con el servidor
        </td>
      </tr>`;
  }
});
