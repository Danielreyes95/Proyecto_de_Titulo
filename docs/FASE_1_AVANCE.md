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
