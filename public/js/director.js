// ===========================
// Toaster para notificaciones
// ===========================
function mostrarToast(mensaje, tipo = "info") {
    const toast = document.createElement("div");

    const colores = {
        info: "bg-blue-600",
        success: "bg-green-600",
        error: "bg-red-600",
        warning: "bg-yellow-500"
    };

    toast.className = `text-white px-4 py-2 rounded shadow ${colores[tipo]}`;
    toast.textContent = mensaje;

    const contenedor = document.getElementById("toast-container");
    contenedor.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ===========================
// Animación de números
// ===========================
function animarNumero(elemento, valorFinal) {
    let inicio = 0;
    const duracion = 800;
    const incremento = valorFinal / (duracion / 20);

    const anim = setInterval(() => {
        inicio += incremento;
        if (inicio >= valorFinal) {
            inicio = valorFinal;
            clearInterval(anim);
        }
        elemento.textContent = Math.floor(inicio);
    }, 20);
}

// ===========================
// Cargar estadísticas
// ===========================
async function cargarEstadisticas() {
    try {
        const [jRes, eRes, pRes, aRes] = await Promise.all([
            fetch(`${BASE_URL}/api/jugadores/count`),
            fetch(`${BASE_URL}/api/entrenadores/count`),
            fetch(`${BASE_URL}/api/pagos/aldia`),
            fetch(`${BASE_URL}/api/asistencia/semana`)
        ]);

        const jugadores = await jRes.json();
        const entrenadores = await eRes.json();
        const pagos = await pRes.json();
        const asistencia = await aRes.json();

        animarNumero(document.getElementById("totalJugadores"), jugadores.total);
        animarNumero(document.getElementById("totalEntrenadores"), entrenadores.total);
        animarNumero(document.getElementById("pagosAlDia"), pagos.total);
        animarNumero(document.getElementById("asistenciaSemanal"), asistencia.total);

        mostrarToast("Estadísticas cargadas correctamente", "success");

    } catch (error) {
        console.error(error);
        mostrarToast("Error al cargar estadísticas", "error");
    }
}

// ===========================
// Logout
// ===========================
function logout() {
    localStorage.clear();
    mostrarToast("Cerrando sesión...", "warning");
    setTimeout(() => {
        window.location.href = "../index.html";
    }, 800);
}

cargarEstadisticas();
