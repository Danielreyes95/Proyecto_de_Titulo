# Entrega V3 · Propuesta 2 — Plataforma de Fútbol

## Alcance
La interfaz multiescuela se reconstruyó por completo, no solo se recoloreó. Las doce páginas activas utilizan **una única hoja de diseño**: `public/assets/css/app-v2.css?v=3.0.0`, y la navegación `public/js/ui-propuesta2.js?v=3.0.0`.

Los CSS antiguos ya no se cargan por separado; las reglas funcionales necesarias quedaron unificadas. Las pantallas históricas del sistema legado permanecen en el repositorio solo como referencia. Con `LEGACY_API_ENABLED=false`, sus antiguas rutas HTML redirigen a los accesos nuevos.

## Páginas incluidas
| Página | Diseño y función |
| --- | --- |
| `plataforma.html` | Dashboard Superadmin, identidad por escuela, tarjetas e invitaciones |
| `director-acceso.html` | Acceso, portada de academia, 4 indicadores reales, agenda, asistencia y accesos directos |
| `categorias-escuela.html` | Tarjetas formativas/competitivas, listado y editor plegable |
| `entrenadores-escuela.html` | Tarjetas del cuerpo técnico, invitaciones, asignaciones y edición |
| `jugadores-escuela.html` | Plantel con filtros y buscador, apoderados y vínculo mediante diálogo |
| `registro-rapido.html` | Flujo de tres pasos, asistencia, estadísticas, guardado y cierre |
| `estadisticas-escuela.html` | KPIs, resumen institucional, donut de asistencia y gráficos reales por mes |
| `avisos-escuela.html` | Indicadores, tarjetas de comunicados y formulario plegable |
| `familia-acceso.html` | Acceso, banner institucional, calendario, avisos y estadísticas familiares |
| `activar-director.html` | Activación de Director |
| `activar-entrenador.html` | Activación de Entrenador |
| `activar-apoderado.html` | Activación de Familia |

## Colores y marca editables
Los datos de branding se leen desde la escuela autorizada: nombre, escudo, portada y colores principal, secundario, acento y texto. Para acercarte a la referencia de diseño puedes establecer desde **Personalización**: principal `#683AC6`, secundario `#FFFFFF`, acento `#F27686`, texto `#24243D`.
Si tu escuela ya tenía un color verde en MongoDB, se conservará hasta que tú lo modifiques; el rediseño no sobreescribe datos ni presenta métricas inventadas.

## Actualizar en VS Code
Detén Node con Ctrl+C y ejecuta estos comandos dentro de la carpeta del repositorio. Si tienes cambios locales pendientes, consérvalos antes de actualizar:

```powershell
git status
git branch --show-current
git switch feature/base-multiescuela-seguridad
git pull origin feature/base-multiescuela-seguridad
npm.cmd ci
npm.cmd test
```

Con tu configuración local de MongoDB Atlas, inicia el servidor (el comando incluye el ajuste DNS necesario en tu equipo):

```powershell
node -e "const dns=require('node:dns'); dns.setServers(['1.1.1.1','8.8.8.8']); require('./src/server.js')"
```

Abrir: `http://localhost:3000/plataforma.html`, `http://localhost:3000/director-acceso.html` y `http://localhost:3000/familia-acceso.html`. El archivo `.env` debe permanecer privado y no se incluye en el ZIP.

## Pruebas de diseño
- `npm.cmd test`: sintaxis y pruebas unitarias/estructura en GitHub Actions.
- `node scripts/ui-visual-smoke.js`: abre 12 páginas en Chromium con respuestas API **ficticias**, comprueba que se utiliza la nueva hoja, que aparecen componentes y gráficos, y genera capturas de escritorio y móvil para ocho módulos.
- Workflow `UI visual V3`: ejecuta ese script y adjunta el artefacto `pantallas-propuesta2-v3` con las capturas. No se conecta a la base de datos real ni utiliza contraseñas.
- En la comprobación manual final, realizar CRUD, invitaciones, permisos cruzados entre dos escuelas y flujos de asistencia con datos exclusivamente ficticios en MongoDB Atlas de pruebas.

## Descarga completa
El proyecto se entrega como un ZIP del código de la rama. Incluye frontend, backend, scripts, pruebas y documentación; no incluye `.env`, contraseñas, `node_modules` ni la información almacenada en MongoDB Atlas. Se recomienda usar `git pull` para actualizar una carpeta ya clonada.

## Pendientes antes de la venta
Las pruebas de maquetación con mocks no sustituyen pruebas E2E con MongoDB real ni revisiones de accesibilidad, seguridad y privacidad de menores. El historial antiguo incluye dependencias y posibles secretos que deben revisarse; hay que remediar vulnerabilidades de dependencias y validar backups, permisos entre instituciones y despliegue. Pagos, notificaciones push y recuperación pública de contraseñas siguen pendientes.
