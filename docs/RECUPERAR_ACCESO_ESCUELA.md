# Recuperar acceso a Director o Entrenador en desarrollo

Si la cuenta ya fue activada y no se recuerda la contraseña, **no es posible leerla desde MongoDB**: la contraseña está almacenada mediante un hash bcrypt.

## Recuperación con Chrome
Abre el gestor de contraseñas de Chrome, busca `localhost:3000`, comprueba si hay una entrada guardada y revela la contraseña utilizando la autenticación del equipo. Nunca pegues contraseñas en un chat.

## Recuperación local de cuenta propia de pruebas
Solo para una cuenta autorizada de Director o Entrenador de la base `plataforma_futbol_test`.

1. Tener `.env` con la conexión a Atlas y acceso a la escuela.
2. Añadir **temporalmente** en `.env`:
   ```dotenv
   RESET_SCHOOL_EMAIL=TU_CORREO_DE_DIRECTOR
   RESET_SCHOOL_SLUG=los-leones-demo
   RESET_SCHOOL_PASSWORD=CONTRASEÑA_NUEVA_DE_16_O_MAS_CARACTERES
   RESET_SCHOOL_CONFIRM=RESET
   ```
3. Tras actualizar el repositorio, ejecutar:
   ```powershell
   node -e "const dns=require('node:dns'); dns.setServers(['1.1.1.1','8.8.8.8']); require('./scripts/reset-school-user-password.js')"
   ```
4. Eliminar **todas las variables RESET_SCHOOL_** del `.env`.
5. Iniciar sesión en `/director-acceso.html` con el mismo correo y contraseña nueva.

El script confirma que la escuela está activa, que la cuenta existe y que posee membresía activa de Director o Entrenador dentro de esa escuela antes de actualizar **solo su contraseña**. Además incrementa `tokenVersion`, invalidando sesiones anteriores. Si la misma cuenta utiliza varios roles, la nueva contraseña aplica a toda esa cuenta de usuario, no solamente al rol de Director.

El login tiene una ventana limitadora de **15 minutos** con máximo de **5 intentos por IP**; si ya aparece `Demasiados intentos`, volver a enviar el formulario durante ese período solo producirá el mismo mensaje. Es una protección independiente del cambio de contraseña.

Este comando **no es un sistema público de recuperación por correo**. Para producción se deberá incorporar un flujo de recuperación con token de un solo uso, validación de correo, caducidad, auditoría y controles de abuso. Nunca reutilizar este script con datos reales de menores o un entorno de producción.
