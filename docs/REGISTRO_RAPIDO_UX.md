# Registro rápido en cancha — decisión de UX

## Problema observado
El flujo anterior obliga a entrar a una ficha de jugador, abrir una tarjeta, editar y guardar por separado. En un entrenamiento o partido, eso genera demasiadas interacciones y dificulta registrar lo que ocurre en el momento.

## Nueva propuesta implementada en rama de desarrollo
Ruta: `/registro-rapido.html?escuela=<escuelaId>`.

1. El director programa una actividad y el sistema fotografía la lista de jugadores activos de la categoría. No se crea automáticamente una ausencia cuando todavía no se ha confirmado la asistencia.
2. El entrenador ingresa con invitación enviada por su director, selecciona su escuela y accede a **Registro rápido**. Solo puede abrir las actividades correspondientes a categorías con asignación activa; el director puede consultar las de su escuela.
3. En una única lista aparecen los nombres, asistencia de un toque y el marcador de la estadística seleccionada. El encabezado cambia la métrica activa para todos los jugadores sin abrir fichas.
4. Botones grandes `+`/`−`; las tarjetas amarilla y roja aparecen en partidos/torneos. La observación sigue siendo opcional y está plegada.
5. Cambiar una métrica a un jugador pendiente lo marca presente. Pasar a ausente o pendiente reinicia sus estadísticas en este evento; se puede deshacer una anotación reciente.
6. Los cambios pendientes se guardan automáticamente por lote al cabo de 1,5 s y también hay botón **Guardar ahora**. La barra indica el estado. Antes de salir con cambios pendientes, el navegador advierte.
7. Si otro dispositivo cambia el evento, la API responde conflicto de revisión (409). Las anotaciones locales permanecen en pantalla; **Sincronizar cambios** descarga la versión actual y compara los campos en conflicto antes de aplicar la versión elegida por el entrenador.
8. El evento no puede cerrarse con asistencias pendientes. Una actividad cerrada se consulta en modo lectura.

## Reglas de seguridad / datos
- La actividad, la lista y cada escritura incluyen `escuela` y autorización de director o entrenador con membresía, ficha activa y categoría asignada.
- La API del modo cancha expone solo nombres/identificadores, asistencia y rendimiento del evento: no envía RUT ni datos de contacto.
- La lista de jugadores se fija al programar la actividad; agregar o cambiar un jugador después no modifica silenciosamente el historial del evento.
- Estadísticas validadas en servidor por allowlist y rango. La revisión optimista evita que una edición concurrente pise otra sin aviso.
- Las respuestas autenticadas de la nueva API llevan `Cache-Control: no-store`.
- Módulo totalmente separado de `Evento` antiguo: se usa `EscuelaEvento`/`escuela_eventos`, no hay migración automática.
- El enlace de invitación del entrenador utiliza token aleatorio, hash persistido y vigencia de 24 h. No se crea sesión para un entrenador solo por registrar su email; debe aceptar la invitación con una cuenta de ese correo.

## Para probar con datos ficticios
1. Preparar entorno local de desarrollo con credenciales nuevas, SMTP y MongoDB Atlas/replica set para transacciones. No utilizar los secretos publicados históricamente.
2. Crear escuela de ejemplo, categorías, apoderados y jugadores ficticios; registrar entrenador y asignarle categoría.
3. En su ficha administrativa, pulsar **Invitar acceso**; el entrenador acepta en `/activar-entrenador.html` e ingresa mediante `/director-acceso.html`.
4. El director programa un entrenamiento o partido desde **Registro rápido**.
5. Con el entrenador autenticado, registrar varios jugadores seguidos usando asistencia y `+`/`−`, esperar confirmación de guardado y verificar al recargar.
6. Abrir dos sesiones de prueba: guardar ediciones de ambas para comprobar la advertencia por conflicto; probar acceso denegado con otra escuela/categoría.
7. Probar sin red y reingresar. **No existe modo offline persistente aún**: debe verse el estado de error y conservar los cambios en la pestaña hasta poder sincronizar.

## Bloqueos antes de producción
- Rotar y remediar credenciales y datos personales versionados en ambos repositorios e historial.
- Probar realmente MongoDB, SMTP, autorizaciones cruzadas, cierres concurrentes y pantalla táctil en teléfonos; las pruebas unitarias/sintaxis no sustituyen esas verificaciones.
- Decidir qué métricas son prioritarias según entrenador/categoría: algunas pueden ser configurables por tipo de entrenamiento para no sobrecargar el modo cancha.
- Evaluar PWA/almacenamiento offline **cifrado y con políticas de protección de datos** solamente después de definir riesgo y sincronización, no guardar datos sensibles en caché local sin control.
