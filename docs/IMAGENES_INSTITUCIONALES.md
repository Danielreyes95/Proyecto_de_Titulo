# Personalización comercial de escuelas: imágenes institucionales

## Capacidad inicial
Director de escuela activa o superadministrador puede cargar, previsualizar,
reemplazar o retirar un **logo** y una **portada** por institución. El nombre
público y colores se gestionan por separado. Cada institución mantiene su
identidad en su panel y portal de familias.

### Almacenamiento y API
- `PUT /api/escuela-sesion/:escuelaId/media/:tipo` y `DELETE`:
  sesión válida + membresía de director en la misma escuela activa.
- `PUT /api/platform/escuelas/:id/media/:tipo` y `DELETE`:
  solo superadministrador autenticado y escuela activa.
- `GET /uploads/escuelas/:escuelaId/:tipo/:archivo`: público solo para
  la imagen **vigente** de una escuela activa. No es un servidor de archivos
  arbitrarios; verifica la URL guardada, metadatos de escuela/tipo,
  identificador y formato del archivo en MongoDB GridFS.
- `tipo` admite exclusivamente `logo` o `portada`.
- La API normal de colores/nombre NO admite modificar `logoUrl` ni
  `portadaUrl`, incluso pasando una ruta interna fabricada.
- GridFS evita perder las imágenes cuando el hosting reinicia con disco efímero.
  No precisa nuevas dependencias npm; usa MongoDB existente.

### Restricciones iniciales
- Selección del usuario en PNG, JPEG o WebP; el navegador convierte el
  resultado a PNG/JPEG y redimensiona.
- Backend verifica caracteres Base64, firma raster PNG/JPEG, dimensiones
  declaradas y tamaño máximo de **750 KB por imagen**.
- Logo hasta **1000 × 1000 px**; portada hasta **2000 × 1400 px**.
- No se aceptan SVG, HTML, data URL como sustituto del archivo, imágenes de
  terceros por URL ni campos arbitrarios de escuela/autor.
- Respuestas públicas llevan `nosniff` y `no-store`. Se retira
  la referencia anterior en reemplazo; los archivos antiguos dejan de
  ser accesibles mediante la API de imágenes.
- La actualización compara la referencia anterior para detectar escrituras
  simultáneas entre director y superadministrador.

### Uso permitido de marcas
Una escuela puede seleccionar colores institucionales libremente dentro del
producto, pero **subir escudos/fotografías/nombres de clubes conocidos solo si
posee derechos o autorización de uso**. La plataforma no incluye
automáticamente logos de Colo-Colo, Universidad Católica, Universidad de
Chile ni de otros terceros.

### Pendiente de comprobación funcional y operación
1. MongoDB nuevo de prueba, escuela A y escuela B con directores distintos:
   intentar modificar/leer medios ajenos, probar suspender escuela.
2. Upload/reemplazo/retiro con PNG con transparencia y fotos JPEG grandes;
   previsualización en Chrome/Edge/móvil y proporciones.
3. Probar SVG/HTML falsos, MIME adulterado, Base64 inválido, foto
   sobredimensionada y requests de más de 1,25 MB.
4. Prueba real de subida/descarga de GridFS, pérdida de conexión y dos
   ediciones simultáneas; verificar que la imagen previa continúa vigente si
   falla el reemplazo y que no quedan archivos huérfanos.
5. Observabilidad de costos de almacenamiento por escuela, cuotas,
   copias y restauración y política de retención/exportación de marca.
6. Escaneo/decodificación de archivos en servidor, formato WebP final,
   variantes responsive y caché/CDN solamente después de cerrar el diseño
   de seguridad y operación.

**Pruebas unitarias y sintaxis no equivalen a un despliegue o auditoría de
seguridad. No usar usuarios reales hasta resolver la exposición histórica
de secretos y datos personales en los repositorios.**
