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
