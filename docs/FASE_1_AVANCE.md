# Fase 1 - Avance técnico (rama feature/base-multiescuela-seguridad)

## Implementado en esta rama
- `.gitignore` y `.env.example` sin secretos.
- Desversionados del árbol ACTUAL de esta rama: `.env`, `db/` y `node_modules/`.
- Arquitectura y criterios de aceptación multiescuela documentados.
- Modelos `Escuela`, `Membresia` (preparatorio) y `PlatformAdmin`.
- API separada `/api/platform` para iniciar sesión como superadministrador, listar/crear escuelas, cambiar nombre/estado y guardar colores/nombre público.
- Endpoint de solo lectura `GET /api/escuelas/:slug/marca` limitado a escuelas activas.
- Panel de administración `/plataforma.html` con creación, resumen, activación/suspensión y previsualización/edición de colores.
- Script `npm run admin:create` que crea la cuenta administrativa a partir de variables de entorno sin exponer contraseñas en respuestas o código.
- Pruebas unitarias iniciales de validación de escuelas, slugs y marca en `tests/escuela-validation.test.js` (todavía sin ejecutar aquí).

## Puesta en marcha de DESARROLLO (no producción)
1. Resguardar BD fuera de repositorios públicos y sustituir datos de pruebas por datos ficticios.
2. Rotar todas las credenciales anteriormente publicadas y configurar un `.env` privado basado en `.env.example`.
3. Definir `PLATFORM_JWT_SECRET` distinto a `JWT_SECRET` (mínimo 32 caracteres aleatorios).
4. Configurar temporalmente `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` (mínimo 16 caracteres); ejecutar `npm ci` y `npm run admin:create`. Retirar la contraseña de bootstrap del entorno tras crear la cuenta.
5. Ejecutar `npm test` y `npm run dev`; revisar que la API y `/plataforma.html` funcionen en entorno de desarrollo.
6. Usar `GET /api/escuelas/<slug>/marca` para obtener la marca pública. Todavía no aplica colores al frontend legado.

## Endpoints nuevos
| Método | Ruta | Control |
| --- | --- | --- |
| POST | /api/platform/auth/login | Credenciales superadmin, límite local de intentos |
| GET | /api/platform/auth/me | JWT de plataforma y cuenta activa |
| GET | /api/platform/escuelas | JWT de plataforma y cuenta activa |
| POST | /api/platform/escuelas | JWT de plataforma y cuenta activa |
| PATCH | /api/platform/escuelas/:id | JWT de plataforma y cuenta activa |
| PATCH | /api/platform/escuelas/:id/branding | JWT de plataforma y cuenta activa |
| GET | /api/escuelas/:slug/marca | Solo metadatos públicos de escuela activa |

Ejemplo de creación (solo con token válido de administración):
```json
{"nombre":"Escuela Deportiva Los Leones","slug":"los-leones"}
```

## Bloqueos antes de producción
- El árbol principal `main`, el segundo repositorio y el historial aún contienen secretos/datos exportados: revocar y reemplazar credenciales, eliminar los datos publicados y evaluar remediación histórica tras respaldo privado. La rama NO soluciona por sí sola ese incidente.
- La API heredada aún tiene rutas sin controles de autorización y recuperación de contraseñas insegura: **no desplegar el sistema como plataforma multicliente**.
- Las escuelas recién creadas todavía no tienen director asignado. La creación NO habilita uso multiinquilino del sistema heredado.
- `Membresia.usuario` referencia un futuro modelo `Usuario`: no utilizar hasta implementar y migrar identidad. No asignar directores mediante la API heredada.
- El límite de intentos de login usa memoria local. Para desplegar con réplicas, implementar almacenamiento compartido, política de intentos y monitoreo.
- Falta compatibilidad de frontend legado y panel del director con branding, carga segura de imágenes, aislamiento de datos, facturación por institución, pruebas e integración continua.
- Los tokens administrativos se guardan en `sessionStorage` en esta versión de desarrollo. Antes de producción evaluar cookies seguras HttpOnly con protección CSRF y CSP estricta.
- No hubo ejecución local de pruebas/integración desde este entorno, debido a que GitHub no fue accesible por clonación en el contenedor; no asumir que la API fue validada de extremo a extremo.

## Siguiente fase
1. Resolver exposición de credenciales y datos personales.
2. Asegurar roles, endpoints de usuarios y recuperación de contraseñas.
3. Migración idempotente con escuela piloto y datos exclusivamente ficticios.
4. Construir asignación de director y autorización por pertenencia a escuela, luego carga validada de imágenes.

## Fase 2 - Alta y acceso independiente de directores (nuevo avance)
- Nueva identidad `Usuario` con contraseñas hasheadas y membresía por escuela.
- Invitación al correo para director, con token aleatorio, hash almacenado, vigencia 24 horas y aceptación de un solo uso.
- Si la identidad no existe, el enlace permite crear cuenta; si ya existe, exige iniciar sesión con esa misma cuenta antes de aceptar una escuela adicional.
- Aceptación y creación de membresía en una transacción MongoDB (requiere MongoDB Atlas o replica set compatible).
- Autenticación separada de directores mediante `SCHOOL_JWT_SECRET`. `/api/escuela-sesion/mis-escuelas` solo devuelve escuelas activas vinculadas al usuario.
- El director puede consultar y editar únicamente la marca de una escuela con membresía activa y estado activo.
- Formulario de invitaciones integrado en `/plataforma.html`; pantalla `/activar-director.html` y selección de escuela en `/director-acceso.html`.
- Validación de sintaxis JS de los archivos nuevos y modificados mediante compilación V8; **no sustituye pruebas funcionales de MongoDB, SMTP o navegador**.

### Flujo de desarrollo
1. Configura credenciales REEMPLAZADAS y `PLATFORM_JWT_SECRET` y `SCHOOL_JWT_SECRET` únicos de al menos 32 caracteres cada uno.
2. Configura `EMAIL_USER`, `EMAIL_PASS`, `FRONTEND_URL` para enviar invitaciones. En desarrollo, el correo debe llevar un enlace que resuelva al servidor local de prueba.
3. Crea superadministrador con `npm run admin:create` tras configurar variables de bootstrap y retíralas del entorno después.
4. Desde `/plataforma.html`, crea una escuela ficticia y envía una invitación a un correo controlado de prueba.
5. Acepta en `/activar-director.html`, ingresa en `/director-acceso.html`, elige escuela y cambia un color.
6. Comprueba que otra escuela y otro director no puedan editar la primera institución.

### Limitaciones aún vigentes
- No existe migración de identidades antiguas a `Usuario`. No utilizar registros reales del proyecto previo para nuevos directores sin una migración revisada.
- El nuevo acceso de directores NO enlaza a los módulos legados de jugadores, asistencia y pagos; estos siguen sin aislamiento por escuela.
- La página antigua `/director/director.html` continúa siendo parte del sistema heredado y NO constituye un panel multiinquilino.
- Todavía no existe la carga de logos/portadas ni notificaciones móviles.
- El nuevo login utiliza limitación por IP en memoria para desarrollo; despliegue real requiere rate limiting compartido, instrumentación y pruebas de seguridad.
- El correo SMTP se envía sin cola persistente. Se requiere política de reintentos, monitoreo y auditoría antes de operar con escuelas reales.
- **No publicar esta rama como solución de producción** mientras continúen los secretos expuestos en otras ramas/historiales y las rutas inseguras del backend previo.

## Fase 3 - Primer módulo realmente aislado: categorías (nuevo avance)
- Modelo separado `EscuelaCategoria` en colección `escuela_categorias` con campo `escuela` obligatorio e inmutable.
- Índice único compuesto por escuela, nombre normalizado y modalidad; permite `Sub 8 Formativo` y `Sub 8 Competitivo` en cada institución.
- CRUD parcial: crear, listar, editar y activar/inactivar sin borrar físicamente; validar rango de edad y cupos.
- API nueva en `/api/escuela-sesion/:escuelaId/categorias`, protegida por JWT de escuela, membresía activa de director y escuela activa.
- Consultas/actualizaciones incluyen siempre el ID de escuela obtenido del contexto de autorización, además del ID de categoría. Una categoría de A no será encontrada con permisos de B.
- Panel `/categorias-escuela.html?escuela=<ID>` con resumen, formulario, listado y acciones; vinculado desde `/director-acceso.html`.
- Se incorporó GitHub Actions para validación de sintaxis y `npm test` en push/PR.
- La API previa `/api/auth`, `/api/categorias`, `/api/jugadores`, pagos, avisos, eventos y Socket.IO legado están **deshabilitados por defecto** en esta rama. Para probar exclusivamente el sistema antiguo en desarrollo local: `LEGACY_API_ENABLED=true` y `NODE_ENV` distinto de `production`. No habilitar en servicios públicos.

### Alcance y próximos pasos
- Categorías nuevas y categorías de la colección histórica NO se mezclan ni se migran automáticamente.
- El módulo de categorías aún no asigna entrenadores/jugadores ni produce estadísticas o pagos.
- La edad no se calcula a partir de fecha de nacimiento en esta fase: esas reglas se introducirán al migrar el módulo de jugadores.
- Antes de pasar a producción siguen pendientes remediación histórica de datos/secretos, tests integrados de aislamiento con MongoDB y verificación de permisos, migración controlada, límites de rate limiting compartidos, cookies/cabeceras seguras y cargas de imagen.
- La verificación de sintaxis no prueba conexiones reales con MongoDB, SMTP ni Mercado Pago.

## Fase 4 - Primer módulo de entrenadores por escuela
- Colección NUEVA `escuela_entrenadores`: escuela inmutable, nombre, email normalizado y estado; correo único por institución (admite trabajo en más de una escuela).
- Colección `asignaciones_entrenador`: vínculos históricos entre entrenador y categoría, con `escuela` inmutable, fecha de cierre y estado activo/finalizado.
- Índice único parcial por `escuela + categoria` para impedir dos entrenadores principales activos simultáneos, permitiendo conservar responsables anteriores.
- Endpoint protegido para listar, registrar, editar y activar/inactivar entrenadores, asignar categorías activas y finalizar asignaciones sin borrarlas.
- Cada consulta, creación y actualización comprueba la escuela obtenida del middleware de membresía; se verifica que entrenador y categoría sean de la MISMA institución y estén activos antes de vincularlos.
- Interfaz `/entrenadores-escuela.html?escuela=<ID>` y enlace desde selección de escuela, con listado, resumen, gestión y asignaciones.
- Pruebas unitarias para campos permitidos, datos normalizados y rechazo de IDs arbitrarios.

**Límites importantes:** registrar un entrenador aún NO crea sus credenciales de acceso ni le da permisos para ver jugadores: hay que extender las invitaciones/membresías y autorizar únicamente sus categorías. Tampoco se han migrado entrenadores y categorías legacy ni hay asignación de jugadores. Falta ejecutar pruebas integradas de índices únicos, solicitudes cruzadas entre escuelas y flujos SMTP/MongoDB. No debe utilizarse con datos reales hasta completar seguridad y remediación histórica.

## Fase 5 - Jugadores y apoderados aislados por institución
- Colecciones nuevas `escuela_jugadores`, `escuela_apoderados` y `vinculos_jugador_apoderado` sin reutilizar registros o contraseñas del sistema heredado.
- Cada documento posee `escuela` obligatorio e inmutable; RUT de jugador/apoderado único por escuela, normalizado y con dígito verificador.
- Alta de apoderado como contacto administrativo **sin crearle una contraseña ni darle acceso automático**. Un adulto puede vincularse a más de un jugador y un jugador a más de un adulto de su escuela.
- Alta de jugador y su primer vínculo mediante transacción MongoDB: categoría activa y apoderado activo deben pertenecer a la misma institución. Si falla alguno, no se registra un jugador aislado.
- El cambio de categoría o fecha de nacimiento vuelve a validar que la edad corresponde a la categoría: **edad cumplida al 1 de enero del año en curso** (regla inicial, revisar según reglamento de cada escuela/torneo).
- Registro, listado y edición limitada; desactivación lógica en lugar de borrado físico. Sin campos arbitrarios de `escuela`, `password` o rol.
- Panel `/jugadores-escuela.html?escuela=<ID>` vinculado a selección de escuela: registro de contactos, jugadores, categorías y vínculo adicional.
- Pruebas unitarias sobre RUT, fechas, campos permitidos y edad al 1 de enero.

### Límites de seguridad y producto
- Los nuevos jugadores **no** están visibles para apoderados ni entrenadores todavía; solo los consulta un director con membresía activa para esa escuela.
- No se incorpora identificación del apoderado a `Usuario` ni invita a que gestione el panel jugador; se requiere proceso verificado de acceso y consentimiento pertinente.
- La regla de edad es una definición temporal de negocio; validar el año de corte y las seis categorías concretas antes de importar jugadores reales.
- Los nuevos modelos no migran ni editan `jugadores`/`apoderados` legacy. Se necesita respaldo, tratamiento de datos personales y migración idempotente revisada.
- Las listas iniciales están limitadas a 200; antes de uso real agregar paginación y búsquedas; automatizar también verificaciones de cupos y concurrencia.
- **No desplegar con información real** hasta remediar exposiciones anteriores, ejecutar tests integrados de aislamiento, validar SMTP/MongoDB y auditar autorización de todos los módulos.

## Fase 6 - UX de registro rápido durante entrenamiento o partido
- Nueva página móvil `/registro-rapido.html?escuela=<ID>`: una sola lista de jugadores con asistencia y controles +/- por estadística seleccionada, sin abrir fichas individuales.
- Vista específica de partido/torneo con tarjetas, observación opcional plegada, búsqueda, filtro y resumen de pendientes.
- Guardado automático por lote (1,5 segundos), botón guardar, deshacer reciente, aviso al abandonar con cambios sin guardar y reconciliación explícita ante edición concurrente.
- Evento con plantilla fija de jugadores activos y asistencia `pendiente/presente/ausente`; cierre exige asistencia completa.
- Backend nuevo `escuela_eventos` y endpoints separados del sistema anterior con control de escuela, rol, entrenador activo y categoría efectivamente asignada.
- Invitaciones de entrenador remitidas desde su ficha administrativa; aceptación para cuenta nueva o cuenta existente del correo invitado.
- Acceso de personal deportivo permite director o entrenador. Entrenador solo accede a sus actividades autorizadas, sin RUT, apoderados o fechas de nacimiento.
- GitHub Actions valida sintaxis y pruebas unitarias de lotes, rangos y campos permitidos (ver ejecución correspondiente al commit actual); falta validación de extremo a extremo.
- Especificación y escenarios de prueba manual: `docs/REGISTRO_RAPIDO_UX.md`.

**Atención:** el modo de registro rápido es una NUEVA implementación multiescuela, no una modificación automática de los eventos legacy ni su frontend. No desplegar todavía para una escuela real sin remediación histórica de secretos/datos y pruebas en MongoDB, SMTP, autorización A/B y móviles.

## Fase 6.1 - Optimización solicitada para entrenador
- Entrenador puede **iniciar actividad desde su teléfono**, sin esperar que el director la programe. La categoría se valida con su asignación activa en la misma escuela.
- Pantalla de cancha incluye atajo de asistencia masiva con confirmación, limitado a pendientes y con opción de deshacer antes de guardar.
- Guardado por lote ampliado a 200 registros para el tamaño máximo actual de un evento.
- Se informa desconexión explícita; no hay almacenamiento offline persistente y se indica mantener la pestaña abierta si existen cambios sin sincronizar.
- Prueba unitaria del permiso para iniciar actividad solo en categoría asignada, adicional a pruebas de validación de lote.
- Seguir bloqueando producción y el merge hasta remediar credenciales/datos previos, ejecutar pruebas con base de datos, correo y teléfonos reales.
