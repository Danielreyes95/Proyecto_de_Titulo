# Evaluación integral de interfaz · Propuesta 2 V3

Fecha de revisión: 2026-11-04. Rama: `feature/base-multiescuela-seguridad`.

## Alcance y metodología

Se comprobaron las doce rutas HTML **activas**. Cada una carga exclusivamente
`/assets/css/app-v2.css?v=3.0.0` y la navegación
`/js/ui-propuesta2.js?v=3.0.0`. No se cargan simultáneamente las antiguas
`plataforma.css` y `ui-propuesta2.css`.

Verificación automatizada:
- Workflow **Node tests**: sintaxis de JavaScript, lógica de dominio y pruebas
  estructurales/funcionales existentes.
- Workflow **UI visual V3**: servidor HTTP aislado, autenticación simulada y
  datos ficticios; abre las doce rutas en Chromium, observa la presencia de la
  capa visual única y componentes relevantes, comprueba desbordamiento horizontal
  del viewport simulado, activa menú móvil y genera capturas en ocho pantallas.
- Las capturas y registros pueden consultarse en el artefacto
  `pantallas-propuesta2-v3` de GitHub Actions. La herramienta Chromium usada
  por CI reporta **500 px** como ancho efectivo mínimo en la ejecución móvil
  (aunque se solicita una ventana 390); esto **no equivale a verificar un
  teléfono físico de 390 px**.

## Revisión por página

| Pantalla | Interfaz V3 | Qué valida la prueba automatizada |
|---|---|---|
| Superadministrador | Sidebar, hero, KPIs, tarjetas, branding, invitación | Capa visual, sesión simulada, sidebar y topbar |
| Director | Portada, 4 indicadores reales, agenda, asistencia, accesos | Datos simulados, tarjetas y navegación |
| Categorías | Tarjetas y editor plegable | Carga de dos tarjetas y tabla |
| Entrenadores | Tarjetas, asignaciones e invitación | Carga de cuerpo técnico |
| Jugadores/Familias | Tabla con filtros, editores y diálogo de vínculo | Tabla visible, layout |
| Registro rápido | Flujo de 3 pasos, asistencias y guardado | Layout y controles principales |
| Estadísticas | KPIs, dona de asistencia, gráfico mensual y detalle | 12 barras y reporte |
| Comunicados | Resumen, tarjetas y redacción plegable | Capa visual y carga |
| Familia | Banner institucional, agenda, avisos y jugadores vinculados | Panel familiar visible |
| Activar Director | Formulario adaptado | Página y CSS |
| Activar Entrenador | Formulario adaptado | Página y CSS |
| Activar Apoderado | Formulario adaptado | Página y CSS |

## Requisitos de diseño

- **Unicidad**: una hoja CSS para todos los módulos actuales, sin mezcla
  de estilos legados.
- **Jerarquía**: módulos con encabezados y resúmenes; los formularios de alta
  no dominan la pantalla inicial.
- **Navegación**: contextual al rol y escuela autenticados por API; sidebar en
  escritorio y botón móvil.
- **Personalización**: colores, nombre, escudo y portada consultados de la
  escuela con autorización; el usuario puede cambiar los colores en su panel.
- **Datos**: los indicadores deben calcularse desde API; las cifras de las
  imágenes de referencia no se utilizan como datos fijos.

## Qué no prueban los workflows

Las comprobaciones visuales usan mocks: no escriben ni leen la base real de
MongoDB Atlas. Deben probarse manualmente con credenciales de una **escuela de
pruebas** y datos ficticios:
1. Iniciar sesión por cada rol y confirmar acceso correcto.
2. Crear/editar/desactivar categoría y entrenador; invitaciones por correo.
3. Crear/editar/vincular jugadores y apoderados.
4. Abrir y cerrar entrenamiento, guardar asistencia y estadísticas, probar
   sincronización entre dispositivos.
5. Confirmar que el cierre actualiza los reportes.
6. Publicar aviso y comprobar vista y confirmaciones de familia.
7. Verificar separación estricta de dos escuelas diferentes.
8. Evaluar el diseño en un teléfono físico, accesibilidad con teclado/lector,
   zoom 200%, colores extremos y contraste.
9. Respaldos, secretos antiguos, dependencias, carga y despliegue controlado.

**Resultado**: V3 es una base de desarrollo verificable visualmente; todavía
no es una aplicación validada para explotación comercial o datos reales de
menores. Mantener `LEGACY_API_ENABLED=false` y credenciales fuera del repositorio.
