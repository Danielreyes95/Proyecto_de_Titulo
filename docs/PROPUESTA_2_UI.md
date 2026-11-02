# Propuesta 2 · Moderna y dinámica

## Alcance
Se aplica el diseño elegido sin reemplazar el backend, las colecciones ni las autenticaciones. Se mantienen el escudo, la portada y los cuatro colores configurables por escuela. El menú no concede permisos: la API comprueba escuela y rol.

## Archivos de diseño
- `public/assets/css/ui-propuesta2.css`: estilos, tarjetas, navegación y experiencia responsive.
- `public/js/ui-propuesta2.js`: navegación autorizada y tema por escuela.
- `public/js/director-acceso.js`: inicio de dirección con indicadores reales (categorías, jugadores, entrenadores y actividades cerradas).
- `public/js/familia-acceso.js`: identidad visual por escuela en portal familiar.
- `tests/ui-propuesta2.test.js`: comprobación automatizada de integración.

## Páginas incluidas
Administración de plataforma; acceso de Director/Entrenador; Categorías; Entrenadores; Jugadores; Registro rápido; Estadísticas; Avisos; Portal familiar; invitaciones y activaciones.

## Instalación desde VS Code en Windows
Desde tu carpeta clonada, en la rama `feature/base-multiescuela-seguridad`:

```powershell
git status
git branch --show-current
git pull origin feature/base-multiescuela-seguridad
npm.cmd ci
npm.cmd test
```

Antes de hacer `git pull`, guarda los cambios locales propios si los hay. Nunca uses `git reset --hard` sin comprender lo que perderías. Conserva tu `.env` exclusivamente en el computador.

Si Node todavía utiliza un resolvedor DNS SRV local que falla, inicia la aplicación con:

```powershell
node -e "const dns=require('node:dns'); dns.setServers(['1.1.1.1','8.8.8.8']); require('./src/server.js')"
```

Accesos: `http://localhost:3000/plataforma.html`, `http://localhost:3000/director-acceso.html` y `http://localhost:3000/familia-acceso.html`.

## Revisión manual recomendada
1. Entrar al Director, seleccionar Academia Los Leones Demo y comprobar sus indicadores desde MongoDB.
2. Recorrer Categorías, Entrenadores, Jugadores, Registro rápido, Estadísticas y Avisos desde el menú.
3. Cambiar colores en una escuela, guardar y volver a cargar; verificar también otra escuela con otros colores.
4. Abrir la app en un teléfono o ventana estrecha: menú, botones, tablas desplazables y formularios.
5. Probar rol Entrenador y confirmar que el servidor rechaza operaciones de Director.
6. Probar portal Familia y confirmar que solo aparecen los jugadores vinculados.

## Pendientes para comercialización
Los mockups contienen ilustraciones conceptuales y no representan módulos que aún no existen. Pagos SaaS, cobro de mensualidades, notificaciones push y funciones adicionales se desarrollarán por separado. Se requieren pruebas E2E, accesibilidad, rendimiento, aislamiento entre dos escuelas, recuperación y respaldos antes de producir.
El historial antiguo de repositorios contenía posibles secretos: deben rotarse y revisarse antes de usar datos reales.

## Descargar proyecto completo
En GitHub, abrir la rama `feature/base-multiescuela-seguridad` y pulsar **Code → Download ZIP**. Si ya tienes el repositorio clonado en VS Code, es mejor hacer `git pull` para mantener tu configuración local.
