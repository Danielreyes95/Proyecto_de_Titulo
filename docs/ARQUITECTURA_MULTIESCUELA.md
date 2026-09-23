# Evolución del Proyecto de Título a plataforma multiescuela

Estado: propuesta técnica inicial. **Este documento NO significa que la aplicación existente ya sea multiescuela.** No habilitar escuelas reales ni subir datos personales antes de implementar y probar aislamiento de datos y permisos.

## Objetivo
Un mismo sistema administrará múltiples escuelas de fútbol. Cada escuela tendrá identidad visual, usuarios, categorías, eventos, jugadores y pagos propios. Un usuario con función de administración de plataforma podrá habilitar nuevas escuelas sin acceder por defecto a los datos privados de sus miembros.

## Conceptos y roles
- **Plataforma**: propietario/administrador técnico de la plataforma; crea y habilita escuelas, administra suscripciones y soporte con acceso excepcional auditado.
- **Escuela (tenant)**: organización aislada con nombre, identificador público (slug), estado y configuración de marca.
- **Director**: gestiona solo su escuela, incluida su identidad visual.
- **Entrenador**: actúa solo sobre categorías asignadas dentro de su escuela.
- **Apoderado / acceso jugador**: accede exclusivamente a los jugadores asociados y datos autorizados de esa escuela. El panel se puede seguir llamando "Jugador"; no asumir que modificar el nombre del rol existente es una migración inocua.

El usuario puede tener vínculos con más de una escuela. Una escuela puede tener más de un director, si el negocio lo decide. Nunca confiar en un `escuelaId` enviado por el navegador como única prueba de acceso.

## Arquitectura incremental
Conservar Node.js, Express y MongoDB inicialmente. Separar:
1. `Usuario`: identidad y credenciales comunes, sin datos deportivos.
2. `Escuela`: nombre, slug único, estado, branding y configuraciones permitidas.
3. `Membresia`: `usuarioId`, `escuelaId`, `rol`, estado, asignaciones opcionales.
4. Datos propios de escuela: `escuelaId` obligatorio en jugador, apoderado/asociación familiar, entrenador/asignación, categoría, evento, asistencia, pago, aviso y reporte materializado.

**Regla de aislamiento:** autenticar identidad + membresía activa, resolver escuela actual, aplicar `escuelaId` en TODAS las consultas/escrituras y confirmar propiedad de objetos referenciados; nunca consultar/modificar directamente por un ID sin comprobar escuela. Usar políticas de autorización por acción, categoría y relación apoderado-jugador.

Ejemplo orientativo:
```js
const escuelaId = req.context.escuelaId; // derivado de sesión + membresía validada
const jugador = await Jugador.findOne({ _id: req.params.id, escuelaId });
if (!jugador) return res.status(404).json({ error: "Jugador no encontrado" });
```

## Identidad visual editable por director
Modelo sugerido `Escuela.branding`:
```json
{
  "nombrePublico": "Escuela Deportiva Ejemplo",
  "logoUrl": "/uploads/escuelas/ID/logo.webp",
  "portadaUrl": "/uploads/escuelas/ID/portada.webp",
  "colorPrimario": "#1D4ED8",
  "colorSecundario": "#FFFFFF",
  "colorAcento": "#F59E0B",
  "colorTexto": "#111827"
}
```
- Usar CSS custom properties para tematizar login, navegación, botones, tarjetas, cabeceras, emails y futura app.
- Validar códigos hex y contraste accesible; previsualizar cambios antes de publicar y permitir restaurar valores.
- Archivos de imágenes: comprobar MIME real, límite de tamaño/dimensiones, procesar imágenes, guardar en almacenamiento de objetos y no aceptar SVG activo sin saneamiento.
- Definir permisos para crear, actualizar y eliminar marca solo para directores de esa escuela.
- No utilizar escudos/nombres de clubes de terceros como si existiera afiliación oficial sin autorización de uso.

## Pagos por escuela
Cada mensualidad pertenece a una escuela, jugador y período. El monto se calcula y valida en servidor según la configuración vigente, nunca a partir de un monto libre del navegador. Índice único adecuado para evitar mensualidades duplicadas según reglas de negocio. Webhook: firma validada, consulta de pago al proveedor, reconciliación e idempotencia por ID externo. Decidir formalmente si la plataforma cobrará por cuenta propia o si cada escuela conectará su cuenta: requieren diseños financieros diferentes; nunca almacenar claves en `branding` ni enviarlas al frontend.

## Ruta hacia una app
1. API segura multiescuela y frontend web responsive.
2. PWA instalable: iconos, manifest, HTTPS, experiencia offline limitada y notificaciones donde estén disponibles.
3. Si la experiencia lo justifica, app React Native / Expo consumiendo la misma API. La marca depende de la escuela seleccionada tras autenticación; no exige publicar una app distinta por escuela.
4. Considerar app independiente con marca de una escuela solo como producto posterior y según distribución/contratos.

## Migración sin perder el proyecto existente
1. Resguardar código y BD fuera del repositorio público; confirmar respaldo restaurable.
2. Remediar secretos y datos publicados; renovar credenciales y revisar historial.
3. Crear escuela piloto sin nombres/datos reales; añadir `escuelaId` y membresías mediante script versionado e idempotente.
4. Cambiar autenticación/autorización y consultas POR MÓDULOS; tests de aislamiento entre dos escuelas en cada módulo.
5. Migrar categorías, jugadores, eventos, asistencia, avisos y pagos. Mantener continuidad de registros históricos.
6. Añadir identidad visual con vista previa y controles de imágenes.
7. Activar alta de nuevas escuelas solo cuando los tests de aislamiento y respaldos pasen.

## Criterios de aceptación iniciales
- Director de escuela A no puede leer ni editar jugadores, pagos, avisos o imágenes privadas de B manipulando IDs.
- Entrenador solo administra sus categorías autorizadas.
- Apoderado solo ve jugadores vinculados mediante asociación validada en backend.
- Ningún endpoint de escritura administrativa queda abierto sin autenticación.
- Cambiar colores/escudo de A no modifica B.
- Una escuela deshabilitada no puede seguir operando con sesiones antiguas.
- Operaciones de pagos son seguras ante reintentos y falsos webhooks.
