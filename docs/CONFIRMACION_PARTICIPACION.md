# Confirmación previa de participación — familias y entrenador

## Necesidad
Un adulto responsable debe poder avisar si su jugador **tiene previsto** participar
en un entrenamiento, partido o torneo. El entrenador puede anticipar asistencia
sin abrir cada ficha y sin confundir la respuesta de la familia con quien llegó
realmente a la cancha.

## Flujo incorporado
1. Director o entrenador con categoría asignada programa una actividad nueva.
2. Las familias con acceso activo ven únicamente los eventos futuros abiertos
   que incluyen a sus jugadores activos vinculados en su categoría actual.
3. Cada jugador tiene respuesta individual: `pendiente`, `asistira`,
   `no_asistira`. Se permite corregir la respuesta antes del cierre del evento.
4. El entrenador ve las respuestas previas junto al nombre del jugador y
   los totales en la lista de actividades. **La asistencia real**
   `pendiente/presente/ausente` permanece independiente y exclusiva del
   personal deportivo autorizado.
5. Cerrar o finalizar una actividad impide modificar la confirmación familiar.
   También se rechaza confirmar eventos anteriores al día actual de Chile.
6. Los cambios en confirmación incrementan `__v` para que las ediciones
   simultáneas con las estadísticas en cancha disparen la revisión optimista,
   en vez de sobrescribirse silenciosamente.

## Reglas de protección
- `PATCH /api/escuela-sesion/:escuelaId/familia/eventos/:eventoId/jugadores/:jugadorId/confirmacion`
  exige sesión, escuela y membresía activas, apoderado vinculado al usuario,
  jugador activo y vínculo con ese apoderado activo dentro de la misma escuela.
- La actualización filtra también por ID del evento, escuela, categoría actual,
  evento abierto y fecha, y existencia del jugador en su plantilla.
- No se admite enviar asistencias observadas, estadísticas, ID de apoderado
  ni ID de escuela mediante el JSON del cambio.
- En la agenda solo se devuelve nombre/ID de jugadores **propios** y respuesta
  de su actividad; nunca la respuesta ni identificador de otro menor.

## Comportamiento de la demo
`public/demo-confirmaciones.html` es **una vista simulada y autónoma**,
no conectada a API/MongoDB ni a credenciales. Permite cambiar de escuela,
probar respuesta de familia y comprobar cómo aparece en pantalla del entrenador.
**No ingresar cuentas, claves ni información real en visores externos**.
La demostración se actualiza en el archivo de esta rama de GitHub.

## Pendientes previos a producción
- Pruebas integradas MongoDB en dos escuelas; revocación simultánea de vínculo
  y actualización de una actividad en varios dispositivos.
- Zona horaria configurable por escuela (ahora America/Santiago).
- Revisar permisos y privacidad con escuelas reales y políticas de datos.
- Remediar exposición histórica de secretos y datos en ambos repositorios,
  realizar migración respaldada y pruebas móvil/accesibilidad.
- Reemplazar demo externa por entorno dedicado de **staging**
  con credenciales nuevas y datos estrictamente ficticios.
