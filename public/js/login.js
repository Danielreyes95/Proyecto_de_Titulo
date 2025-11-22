document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const rut = document.getElementById("rut").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rut, password }),
    });

    const data = await res.json();
    console.log("RESPUESTA LOGIN:", data);

    // Si hay error de backend
    if (!res.ok || data.error) {
      mostrarNotificacion(data.error || "Credenciales incorrectas");
      return;
    }

    // Limpio por si habían datos antiguos
    localStorage.clear();

    // Guardar token y rol
    localStorage.setItem("token", data.token);
    localStorage.setItem("rol", data.rol);

    /* ===========================================
       🟢 DIRECTOR
    =========================================== */
    if (data.rol === "director") {
      // (Opcional) guardar datos del director si los necesitas después
      // localStorage.setItem("idDirector", data.usuario.id);
      // localStorage.setItem("nombreDirector", data.usuario.nombre);
      window.location.href = "./director/director.html";
      return;
    }

    /* ===========================================
       🟢 ENTRENADOR
    =========================================== */
    if (data.rol === "entrenador") {
      localStorage.setItem("idEntrenador", data.usuario.id);
      localStorage.setItem("nombreEntrenador", data.usuario.nombre);
      localStorage.setItem("correoEntrenador", data.usuario.correo || "");

      if (data.usuario.categoria) {
        localStorage.setItem("categoria", data.usuario.categoria);
      }

      if (data.usuario.categoriaNombre) {
        localStorage.setItem("categoriaNombre", data.usuario.categoriaNombre);
      }

      window.location.href = "./entrenador/entrenador.html";
      return;
    }

    /* ===========================================
       🟢 APODERADO → PANEL JUGADOR
    =========================================== */
    if (data.rol === "apoderado" && data.panel === "jugador") {
      console.log("LOGIN APODERADO DETECTADO → Redirigiendo panel jugador");

      // Datos del apoderado
      localStorage.setItem("idApoderado", data.usuario.id);
      localStorage.setItem("nombreApoderado", data.usuario.nombre);
      localStorage.setItem("rutApoderado", data.usuario.rut || "");
      localStorage.setItem("correoApoderado", data.usuario.correo || "");

      // Datos del jugador (hijo)
      if (data.jugador) {
        localStorage.setItem("idJugador", data.jugador._id);
        localStorage.setItem("nombreJugador", data.jugador.nombre);
        localStorage.setItem("rutJugador", data.jugador.rut || "");

        // 🔥 CLAVE: esto es lo que usa jugador.html
        if (data.jugador.categoria) {
          localStorage.setItem("categoriaIdJugador", data.jugador.categoria);
          localStorage.setItem(
            "categoriaNombreJugador",
            data.jugador.categoriaNombre || ""
          );
        }
      }

      window.location.href = "./jugador/jugador.html";
      return;
    }

    /* ===========================================
       ❌ Si ningún caso coincide
    =========================================== */
    mostrarNotificacion("Rol de usuario no reconocido.");

  } catch (err) {
    console.error(err);
    mostrarNotificacion("Error al intentar iniciar sesión");
  }
});
