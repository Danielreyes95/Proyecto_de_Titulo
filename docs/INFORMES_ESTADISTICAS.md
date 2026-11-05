# Informes de estadísticas — categoría y jugador

## Objetivo
Transformar los registros hechos con un toque en **Modo cancha** en un informe útil para el director y el entrenador, sin duplicar el trabajo del entrenador ni abrir cada ficha para consultar los acumulados.

### Acceso
- Ruta frontend: `/estadisticas-escuela.html?escuela=<ID>`.
- Desde `/director-acceso.html`: **Estadísticas y evolución**.
- Desde una actividad de `/registro-rapido.html`: **Ver estadísticas**, con la categoría preseleccionada.
- Director: categorías de su escuela (incluye inactivas para historia).
- Entrenador: categorías que tiene **activamente asignadas** en su escuela. No accede a otras categorías de la misma escuela ni a otra institución.

## API
- `GET /api/escuela-sesion/:escuelaId/estadisticas/categorias/:categoriaId?anio=2026`
  - Resumen anual, cantidad de actividades por tipo, tendencia mensual de 12 meses y acumulados por jugador.
  - Devuelve nombre de jugador, ID y estadísticas; no incluye RUT, fechas de nacimiento, contactos ni observaciones.
  - Incluye alumnos actuales sin actividades cerradas (cero actividad; porcentaje y promedio sin dato) y jugadores que participaron en la categoría pero luego fueron reasignados.
- `GET /api/escuela-sesion/:escuelaId/estadisticas/categorias/:categoriaId/jugadores/:jugadorId?anio=2026`
  - Historial de **hasta 20 actividades cerradas recientes** en la categoría y año autorizados. Informa si existen más registros.
  - No expone el resto del plantel ni notas de observación.

## Reglas de cálculo
1. Se consideran **solo eventos cerrados** de la colección nueva `escuela_eventos` que coincidan con escuela, categoría y año UTC seleccionado. Un evento abierto no aparece en el reporte hasta cerrarse correctamente.
2. La asistencia se calcula sobre los registros de jugadores participantes en la plantilla capturada al crear el evento: presentes / (presentes + ausentes) × 100. No confundir con el porcentaje de eventos realizados.
3. Estadísticas deportivas (goles, asistencias, recuperaciones, etc.) y tarjetas se suman **solo si el registro del jugador está marcado presente**. Una ausencia nunca suma producción deportiva.
4. Promedio de rendimiento: suma de notas efectivamente registradas / cantidad de evaluaciones válidas. Una nota vacía es `null`, no un cero.
5. Si no hay registros de asistencia o notas, el informe muestra **«—»**; no afirma 0 % o un promedio 0.
6. Tendencia mensual = cantidad de actividades cerradas por mes. Los gráficos son descriptivos; no ordenan ni etiquetan negativamente a jugadores menores.
7. El año usa límites UTC [1 de enero, 1 de enero siguiente), consistentes con la fecha de evento almacenada a mediodía UTC.

## Privacidad, aislamiento y exactitud
- El middleware valida el JWT, la cuenta activa, la membresía de rol correspondiente, el estado de la escuela, el entrenador activo y sus asignaciones activas.
- Se valida categoría **antes** de consultar estadísticas; el `$match` de MongoDB incluye `escuela`, `categoria`, `cerrado:true` y fechas. Se filtran los jugadores buscados por escuela.
- Los modelos anteriores `Evento`/`Jugador` no se mezclan. No se genera historia ficticia ni se migran datos automáticamente.
- No incluye exportación CSV ni descarga de datos de menores en esta fase.
- Nunca considerar este código producción hasta revocar secretos/retirar datos personales publicados y completar pruebas de extremo a extremo.

## Casos de aceptación para QA
- Dos escuelas con categorías iguales generan resultados independientes.
- Un entrenador de Sub 8 no puede pedir reporte de Sub 10 manipulando la URL.
- Al registrar dos goles en un evento abierto no cambia el informe anual; al cerrarlo sí.
- Un jugador ausente no suma goles ni nota; en el denominador de asistencia cuenta como ausente.
- Dos jugadores con igual nombre se distinguen por ID sin enviar su RUT a esta pantalla.
- Un jugador reasignado conserva su historia deportiva en la categoría original.
- Una categoría inactiva conserva historia consultable para personal autorizado, pero no acepta crear eventos nuevos.
- Si no hay actividades cerradas, el informe muestra «—» para porcentajes/medias y cero actividades.
- Al intentar consultar los últimos eventos de un jugador de otra escuela, la API responde no encontrado.

## Vista institucional agregada (director)
- `GET /api/escuela-sesion/:escuelaId/estadisticas/resumen?anio=2026`, con `requireSchoolUser` y **`requireDirector`**. No basta ser entrenador ni pertenecer a otra escuela.
- Agrupa exclusivamente eventos **cerrados**, por escuela y rango anual UTC, antes de extraer registros. Cuenta cada evento solo una vez mediante `$addToSet`.
- Devuelve actividades, asistencias, ausencias y goles por categoría, más totales de toda la escuela. No incluye fichas, RUT, identificadores de jugadores ni notas individuales.
- Incluye categorías inactivas para preservar su historia y categorías sin actividades, mostrando asistencia «—» cuando no hay denominador.
- La pantalla de informes muestra este bloque solo al director; puede abrir los detalles de una categoría desde la misma vista.
- Valores por categorías representan acumulados de sus eventos históricos, no una comparación de habilidad de los jugadores.
- Pendiente: QA real con MongoDB y dos escuelas y auditoría de uso por usuarios reales antes de puesta en producción.
