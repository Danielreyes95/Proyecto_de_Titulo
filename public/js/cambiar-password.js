async function cambiarPassword() {
    const pass1 = document.getElementById("pass1").value.trim();
    const pass2 = document.getElementById("pass2").value.trim();
    const msg = document.getElementById("msg");

    msg.classList.add("hidden");
    msg.innerText = "";

    // Validaciones
    if (!pass1 || !pass2) {
        msg.innerText = "Debes completar ambos campos.";
        msg.classList.remove("hidden");
        return;
    }

    if (pass1.length < 6) {
        msg.innerText = "La contraseña debe tener al menos 6 caracteres.";
        msg.classList.remove("hidden");
        return;
    }

    if (pass1 !== pass2) {
        msg.innerText = "Las contraseñas no coinciden.";
        msg.classList.remove("hidden");
        return;
    }

    // Obtener ID del apoderado
    const id = localStorage.getItem("idApoderado");

    if (!id) {
        msg.innerText = "Error: No se encontró ID del usuario. Inicia sesión nuevamente.";
        msg.classList.remove("hidden");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/auth/cambiar-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                passwordNueva: pass1
            })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            msg.innerText = data.error || "Error al cambiar contraseña.";
            msg.classList.remove("hidden");
            return;
        }

        // Todo bien → limpiar ID temporal
        localStorage.removeItem("idApoderado");

        alert("Contraseña cambiada correctamente. Ahora puedes ingresar.");
        window.location.href = "index.html";

    } catch (error) {
        msg.innerText = "Error de conexión con el servidor.";
        msg.classList.remove("hidden");
        console.error(error);
    }
}
