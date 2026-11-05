# Etapa comercial 1 · Paso 1: aislamiento y roles multiescuela

**Estado:** pruebas unitarias de autorización incorporadas en
`tests/aislamiento-multiescuela.test.js`. Son pruebas con modelos
MongoDB simulados, sin alterar Atlas.

## Objetivo
Impedir que un Director, Entrenador o Apoderado pueda acceder a registros,
eventos, escuelas o categorías que no le correspondan.

### Reglas ya implementadas que se revisan
- Toda ruta con `/:escuelaId` exige token de usuario escolar y
  autorización de rol en el backend.
- Director: membresía activa de esa escuela y escuela activa.
- Entrenador: membresía activa, ficha activa y asignación de categoría activa.
- Apoderado: membresía activa, ficha de apoderado vinculada al usuario.
- Los controladores consultados de categorías, entrenadores, jugadores, avisos,
  eventos, informes y familias usan filtros de escuela autorizada.
- No basta cambiar `?escuela=` en una dirección del navegador para acceder.

## Prueba guiada con dos escuelas, sin datos reales

### Paso 1. Preparación local
1. Detén el servidor con Ctrl+C.
2. En VS Code ejecuta:
   ```powershell
   git status
   git pull origin feature/base-multiescuela-seguridad
   npm.cmd test
   ```
3. Inicia el servidor con el comando DNS que funciona en el computador:
   ```powershell
   node -e "const dns=require('node:dns'); dns.setServers(['1.1.1.1','8.8.8.8']); require('./src/server.js')"
   ```
4. Ingresa al Superadmin en `http://localhost:3000/plataforma.html`.

### Paso 2. Escuela A
- Escuela existente: **Academia Los Leones Demo** (`los-leones-demo`).
- No borrar jugadores, categorías ni eventos ficticios ya cargados.
- Iniciar sesión como Director de A para confirmar que puede entrar normalmente.

### Paso 3. Crear una Escuela B sin usuarios reales
Desde Superadmin crear:
- **Nombre:** Academia Estrellas Demo
- **Slug:** `estrellas-demo-qa` (si el slug está disponible)
- **Branding:** otro color principal distinto del de A.

No crear niños ni copiar información real. Se pueden usar únicamente datos
ficticios para futuras pruebas.

### Paso 4. Comprobar el aislamiento
- Como Director de A: actualizar “Mis escuelas” y comprobar que B no aparece.
- Como Superadmin: comprobar que A y B aparecen en el listado y mantienen
  identidades de marca distintas.
- Obtener el ID de Escuela B desde el panel de Atlas de la base de **pruebas**
  (sin compartir credenciales).
- Manteniendo sesión solo como Director de A, abrir en la barra de direcciones
  `http://localhost:3000/categorias-escuela.html?escuela=ID_DE_B`.
  El servidor debe **rechazar los datos**. La página podría mostrar un mensaje
  de acceso no disponible, en vez de categorías de B.
- Si se usa la pestaña de red del navegador, una solicitud a
  `/api/escuela-sesion/ID_DE_B/categorias` deberá responder 404
  para el Director de A. No copiar tokens a chats ni capturas.
- Volver a A y comprobar que sus categorías siguen accesibles.

### Paso 5. Comprobar entrenamiento y familia
Cuando se dispone de cuentas de pruebas independientes (que controles),
invitar Director B y verificar una categoría exclusiva de B.
Posteriormente asignar un entrenador a una categoría B y comprobar que no
pueda ver otras categorías. Finalmente vincular un apoderado ficticio a un
único jugador y confirmar que el portal no entrega información de otros niños.

### Resultado esperado
- A y B independientes.
- Director A solo obtiene datos de A.
- Director B solo obtiene datos de B, salvo que tenga membresía válida en A.
- Entrenadores y familias solo reciben recursos explícitamente autorizados.
- La marca (colores, escudo, portada) es independiente por escuela.

## Límites importantes
Estas pruebas con mocks y navegación manual son una primera barrera, **no**
certifican seguridad en producción. Antes de vender o cargar datos reales de
menores faltan pruebas integradas con dos escuelas, auditoría de endpoints,
recuperación pública segura de cuentas, controles de sesión, copias de seguridad,
revisión de datos y contratos de servicio/privacidad. La app móvil debe consumir
la misma API HTTPS y respetar estas mismas reglas, no replicar autorización
solo en el cliente.
