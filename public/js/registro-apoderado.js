async function registrarApoderado() {
    const msg = document.getElementById("msg");
    msg.classList.add("hidden");
    msg.innerText = "";

    // Capturar datos del formulario
    const data = {
        rutApoderado: document.getElementById("rutApoderado").value.trim(),
        nombreApoderado: document.getElementById("nombreApoderado").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        passwordApoderado: document.getElementById("passwordApoderado").value.trim(),

        rutJugador: document.getElementById("rutJugador").value.trim(),
        nombreJugador: document.getElementById("nombreJugador").value.trim(),
        fechaNacimiento: document.getElementById("fechaNacimiento").value
    };

    // Validación básica
    if (!data.rutApoderado || !data.nombreApoderado || !data.telefono ||
        !data.correo || !data.passwordApoderado ||
        !data.rutJugador || !data.nombreJugador || !data.fechaNacimiento) {

        msg.innerText = "Todos los campos son obligatorios.";
        msg.classList.remove("hidden");
        return;
    }

    // Validación muy simple de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.correo)) {
        msg.innerText = "Ingresa un correo válido.";
        msg.classList.remove("hidden");
        return;
    }

    // Opcional: forzar mínimo de caracteres en contraseña
    if (data.passwordApoderado.length < 6) {
        msg.innerText = "La contraseña debe tener al menos 6 caracteres.";
        msg.classList.remove("hidden");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/auth/registro-apoderado`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });

        // Si el backend devuelve HTML por error (por ejemplo 404), evitamos el JSON parse directo
        let json;
        try {
            json = await res.json();
        } catch {
            json = { error: "Respuesta inesperada del servidor." };
        }

        if (!res.ok) {
            msg.innerText = json.error || "Error al registrar la cuenta.";
            msg.classList.remove("hidden");
            return;
        }

        // Muestra mensaje + categoría si viene desde el backend
        const textoCategoria = json.categoriaAsignada
            ? ` Categoría asignada: ${json.categoriaAsignada}.`
            : "";

        alert((json.mensaje || "Cuenta creada correctamente.") + textoCategoria);

        // Volver al login
        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        msg.innerText = "Error al conectar con el servidor.";
        msg.classList.remove("hidden");
    }
}