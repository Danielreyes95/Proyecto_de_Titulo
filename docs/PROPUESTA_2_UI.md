# ENTREGABLE COMPLETO · PROPUESTA VISUAL 2 (moderna y dinámica)

Actualización visual real de la plataforma multiescuela de fútbol.

## Qué cambia

- **Superadministrador**: nuevo panel con sidebar, topbar, hero morado/turquesa, KPIs, catálogo de tarjetas de escuelas, formularios y gestión de branding.
- **Director/Entrenador**: pantalla de acceso renovada; menú por rol, dashboard de escuela, indicadores reales, formularios y tablas con el diseño transversal.
- **Familia**: menú y componentes visuales del mismo sistema, y colores institucionales de la escuela autorizada.
- **Módulos incluidos**: Categorías, Entrenadores, Jugadores, Apoderados, Registro rápido, Estadísticas, Avisos y activaciones.
- **Responsive**: a partir de 959 px el menú pasa a botón desplegable; tablas anchas se desplazan horizontalmente.
- **Personalización**: color principal/secundario/acento/texto, escudo, portada y nombre público por escuela; colores guardados en MongoDB.
- **Caché visual**: CSS/JS de la interfaz llevan query de versión `v=2.1.0`, para que los navegadores descarguen los archivos nuevos.

Los datos son reales de la base de desarrollo, no cifras fijas del mockup: el dashboard del Superadmin consulta el listado, estados y branding; el Director consulta sus categorías, jugadores, entrenadores y actividades cerradas.

## Código y estructura

| Archivo | Función |
| --- | --- |
| `public/plataforma.html` | Panel Superadmin reestructurado |
| `public/js/plataforma.js` | Catálogo de escuelas real, sin HTML inyectado |
| `public/director-acceso.html` | Login/panel Director y Entrenador |
| `public/js/director-acceso.js` | Integra navegación, indicadores y edición de imagen |
| `public/js/familia-acceso.js` | Portal familiar y marca por escuela |
| `public/js/ui-propuesta2.js` | Sidebar/topbar, menú móvil, roles, marca |
| `public/assets/css/ui-propuesta2.css` | Estilos completos (responsive) |
| `tests/ui-propuesta2.test.js` | Pruebas de regresión |

**No** se sustituyeron las rutas API, modelos de MongoDB, cuentas ni permisos existentes. El frontend nunca decide quién puede ver una escuela: lo sigue decidiendo el backend autenticado.

## Windows / VS Code: cuando YA tienes una carpeta clonada

1. Cierra el servidor que ocupa el puerto 3000 (`Ctrl + C`).
2. Abre la terminal de VS Code dentro de la carpeta del repositorio.
3. Comprueba cambios locales antes de actualizar (no uses comandos destructivos):

```powershell
git status
git branch --show-current
git switch feature/base-multiescuela-seguridad
git pull origin feature/base-multiescuela-seguridad
npm.cmd ci
npm.cmd test
```

**Si `git status` informa cambios propios sin guardar, guárdalos o registra un commit antes de cambiar de rama o traer actualizaciones.**

4. Inicia el servidor. Para el equipo donde fallaba la resolución DNS SRV:

```powershell
node -e "const dns=require('node:dns'); dns.setServers(['1.1.1.1','8.8.8.8']); require('./src/server.js')"
```

5. Abre `http://localhost:3000/plataforma.html`, inicia sesión y deberías ver una **barra lateral morada**, el encabezado "Una plataforma. Múltiples escuelas." y un **catálogo de tarjetas**. Esta es una comprobación inequívoca de la entrega 2.1.
6. Si Chrome sigue mostrando algo viejo: `Ctrl + Shift + R` y comprueba en DevTools > Network que se carguen `ui-propuesta2.css?v=2.1.0` y `ui-propuesta2.js?v=2.1.0`.

## Windows / VS Code: instalación DESDE CERO

```powershell
cd "$HOME\Documents"
git clone --branch feature/base-multiescuela-seguridad --single-branch https://github.com/Danielreyes95/Proyecto_de_Titulo.git Plataforma_Futbol
cd Plataforma_Futbol
code .
npm.cmd ci
npm.cmd test
Copy-Item .env.example .env
```

Edita `.env` **sin compartir claves**. Configura `MONGO_URI` con una base **de pruebas**, `JWT_SECRET`, `PLATFORM_JWT_SECRET`, `SCHOOL_JWT_SECRET`, `FRONTEND_URL` y `BACKEND_URL`. Los tres JWT secretos deben ser únicos, fuertes y distintos. No necesitas recrear la cuenta Superadmin si ya existe en la misma base de pruebas: solo inicia sesión con tus credenciales existentes.

Si Atlas rechaza conexiones, autoriza únicamente la IP actual del equipo, revisa URI/usuario y el estado del clúster. No habilites acceso de todas las IP.

**No subas `.env` a GitHub.** La base de datos de pruebas es independiente de la descarga ZIP: no está incluida dentro del código fuente.

## Instalación desde ZIP, sin Git

En GitHub, selecciona la rama `feature/base-multiescuela-seguridad` y usa **Code > Download ZIP**. Extrae el proyecto, ábrelo en VS Code y ejecuta `npm.cmd ci`, `npm.cmd test`. Crea `.env` desde `.env.example`. La carpeta `node_modules` y las contraseñas no se distribuyen.

## Pantallas a comprobar

- `http://localhost:3000/plataforma.html` → Superadmin
- `http://localhost:3000/director-acceso.html` → Director o Entrenador
- `http://localhost:3000/familia-acceso.html` → Familia

En la prueba de aceptación:
1. Superadmin: sidebar visible, hero visual, 1 escuela en el catálogo (si esa es tu base de desarrollo).
2. Cambia la selección de escuela y verifica colores/escudo; no se inventan escuelas.
3. Entra al Director, abre una escuela y recorre categorías, jugadores, entrenador, registro y estadísticas.
4. En móvil o ventana menor a 960 px, usa el botón del menú.
5. Verifica que un Entrenador no obtiene acceso a funciones de Director y que un Apoderado ve únicamente a sus propios jugadores.
6. Cambia la identidad de una escuela y verifica que la marca se actualice sin alterar otra escuela.

## Pruebas y límites

GitHub Actions ejecuta `node --check` sobre los archivos JavaScript y `npm test`. Las pruebas de UI son comprobaciones automatizadas de estructura/integración; **no equivalen a pruebas E2E** con navegador, MongoDB ni teléfonos reales. Antes de comercializar faltan pruebas de seguridad y aislamiento multiescuela, accesibilidad, rendimiento, correo, recuperaciones, despliegue, copias de seguridad y remediación histórica de secretos potencialmente expuestos. Los mockups tienen ilustraciones y cifras conceptuales: no equivalen a módulos de cobro o notificaciones push implementados.
