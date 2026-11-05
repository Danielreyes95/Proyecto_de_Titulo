# Acciones de seguridad previas al despliegue

**Atención:** se detectaron `.env`, `node_modules/` y exportaciones `db/` con posibles datos personales en repositorios públicos **Proyecto_de_Titulo** y **ProyectodeTitulo**. Añadir `.gitignore` no retira archivos ya versionados ni borra historial.

1. Revocar y reemplazar las credenciales expuestas de MongoDB, firma JWT, correo y Mercado Pago (según cuáles se usaron). Revisar acceso y actividad de los servicios. No reutilizar secretos antiguos.
2. Identificar si los respaldos contienen personas reales. Detener su exposición, preservar solo una copia privada legítima para migración, sustituir datos de demostración por registros ficticios.
3. Eliminar `.env`, `db/` y `node_modules/` de seguimiento en AMBOS repositorios. Revisar commits anteriores: la remoción de historial requiere un proceso específico y coordinación con clones/forks; eliminar archivos en un commit nuevo no basta.
4. Configurar las variables de entorno exclusivamente en el entorno de despliegue y `.env` local. Guardar únicamente `.env.example` sin secretos.
5. No poner en producción la API actual: algunas rutas carecen de autorización; la recuperación/cambio de contraseñas y la autenticación Socket.IO requieren rediseño.
6. Mantener respaldo privado probado antes de migrar colecciones o cambiar índices de MongoDB.

No se incluyeron valores de credenciales ni datos personales en este documento.
