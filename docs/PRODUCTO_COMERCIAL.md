# Plataforma comercial de gestión de escuelas de fútbol — definición de producto

## Cambio de objetivo (septiembre 2026)
Esta evolución **ya no se gestiona como entrega de un Proyecto de Título**:
es un producto comercial en desarrollo, ofrecido como software de servicio
(SaaS) para diversas escuelas de fútbol. El repositorio conserva su nombre
histórico, pero la arquitectura, las prioridades y la documentación
deben responder a usuarios, seguridad, continuidad y sostenibilidad del producto.

## Cliente y usuarios
- **Titular de la plataforma**: crea/suspende escuelas, invita dirección,
  administra planes de servicio, soporte, seguridad y facturación comercial.
- **Escuela cliente / director**: configura marca, categorías, tarifas,
  equipo, jugadores, actividades y reportes, dentro de SU institución.
- **Entrenador**: ve únicamente categorías asignadas y registra asistencia,
  rendimiento y programación desde modo cancha.
- **Familia/apoderado**: ve solo sus jugadores vinculados, agenda, avisos,
  confirmaciones, estados de cuenta y comprobantes cuando el módulo exista.
- **Jugador**: perfil deportivo representado por su familia; no se crea
  automáticamente una cuenta personal de acceso por ser jugador menor.

## Dos cobros distintos que NO se deben mezclar
1. **Suscripción de la escuela al proveedor SaaS**: el cliente paga por usar
   la plataforma según un plan de servicio (por ejemplo, prueba, activo,
   vencido, suspendido). La cobranza corresponde al proveedor del software.
2. **Mensualidades de los jugadores a la escuela**: cada institución
   define sus importes y recibe sus cobros. La plataforma registra y, si
   se integra una pasarela, confirma el pago respetando la titularidad
   y condiciones comerciales de esa escuela. No presumir que los fondos
   de mensualidades pertenecen al proveedor SaaS.

Separar modelos, autorizaciones, credenciales de pasarela, estados,
informes y conciliaciones. No habilitar Mercado Pago legacy del repositorio
original en el producto multiescuela.

## MVP comercial candidato
1. Alta por superadministrador e invitación verificada de dirección.
2. Escuela aislada con branding propio: nombre, colores, escudo, portada.
3. Categorías/entrenadores/jugadores y contactos vinculados.
4. Programación, confirmaciones y registro rápido en cancha.
5. Informes y portal familiar.
6. Avisos de escuela y soporte al cliente.
7. Cobranza de mensualidades con verificaciones de servidor y conciliación.
8. Cuenta de la escuela, plan contratado y límites aplicados en la API.

## Experiencia y operaciones antes del primer cliente
- **Onboarding** guiado: crear escuela, personalizar imagen, configurar
  categorías y entrenador, invitar familia; comprobar progreso.
- **Staging privado** con datos sintéticos y URL accesible desde navegador;
  nunca utilizar credenciales o datos históricos filtrados.
- **Seguridad**: rotar claves expuestas en ambos repositorios y remediar
  historial, autorización integrada entre escuelas, cookies seguras,
  recuperación de cuenta, auditoría, rate limiting compartido,
  backups y restauración probada.
- **Confiabilidad**: métricas de errores, alertas, cola de correo,
  monitoreo de entregas, cuotas, política de suspensión/retención
  y recuperación ante fallas.
- **Producto**: términos, política de privacidad y manejo de datos de
  menores, permisos de imágenes/escudos, soporte, accesibilidad y
  salida/exportación de una escuela que decida retirarse.
- **Distribución**: web adaptable primero, evaluar PWA después de
  seguridad y operación, aplicación móvil posterior sobre API estable.
- **Comercial**: validación con escuelas piloto, definición de planes
  y costos reales de infraestructura/operación; no fijar precios arbitrarios.

## Personalización visual implementada como primer bloque comercial
- Director y superadministrador pueden guardar nombre y colores por escuela.
- En esta rama se incorporó subida inicial de **logo y portada PNG/JPEG**
  con transformación local en el navegador y validación de firma,
  dimensiones y tamaño en servidor; se almacenan en MongoDB GridFS,
  no en el disco efímero de hosting.
- Una ruta pública entrega **solo la versión vigente** de una escuela
  activa, sin aceptar URL arbitraria ni SVG/HTML.
- Límite inicial de 750 KB por imagen, logo hasta 1000×1000,
  portada hasta 2000×1400. Revisar compresión/calidad y retención
  tras pruebas de navegador/MongoDB.
- **Escudos de clubes ajenos**: usar únicamente imágenes sobre las que
  la escuela tenga autorización de uso. Personalización técnica
  no otorga automáticamente derechos sobre escudos, fotografías,
  nombres o marcas de terceros.

## Decisión pendiente de propiedad del código
El proyecto histórico aún incluye `"license": "ISC"` en
`package.json` y `package-lock.json`, mientras ambos repositorios
han sido públicos. Definir una política consciente de distribución,
licenciamiento y repositorios antes de comercializar; **no cambiar
licencias ni visibilidad sin una decisión expresa de su titular**.
Las dependencias de terceros conservan sus propias licencias.

## Hitos verificables para salir del estado «en desarrollo»
- Todas las pruebas automatizadas y de integración pasan en el commit
  que se pretende desplegar.
- Dos escuelas de prueba separadas; el mismo entrenador/familia con
  roles distintos no accede a datos cruzados.
- Imágenes, sesiones, correo, registros y pagos verificados end-to-end.
- Copias de seguridad restaurables y plan de respuesta a incidentes.
- Prueba táctil de modo cancha con personas autorizadas y datos ficticios.
- Una escuela piloto puede ejecutar su proceso completo de punta a punta.
