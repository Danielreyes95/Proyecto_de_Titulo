# Portal de familias — primera versión en GitHub

## Objetivo y privacidad
El director invita a un apoderado que ya esté registrado como contacto en
**su propia escuela**. La persona invitada activa el enlace que llega al correo
indicado; entonces el sistema vincula una identidad `Usuario` al registro
`EscuelaApoderado` y crea una membresía `apoderado` en esa escuela.

**No basta conocer el correo, un RUT o un ID para consultar a un jugador.**
El backend exige sesión válida, membresía activa en la escuela indicada,
contacto activo vinculado al usuario autenticado y vínculo apoderado–jugador
activo en esa misma escuela. El vínculo del contacto y la membresía se crean
en una transacción MongoDB. El enlace es aleatorio, se guarda solo su hash,
vence en 24 horas y se consume una vez.

## Flujo futuro en la aplicación
1. Director crea contacto apoderado y registra/vincula al jugador.
2. En `/jugadores-escuela.html`, selecciona «Invitar acceso familiar».
3. El enlace en `/activar-apoderado.html` permite crear cuenta o entrar con
   la cuenta que ya usa en otra escuela, siempre con el correo invitado.
4. El apoderado ingresa desde `/familia-acceso.html`, selecciona la escuela
   y consulta sus jugadores activos vinculados.

## Primera versión de consulta
- Nombre del jugador y categoría actual.
- Asistencia reciente de sus últimas actividades cerradas y goles de esa
  misma actividad, únicamente cuando aparece presente.
- No se envían RUT, teléfonos, correos de otras familias, listas de equipo,
  observaciones privadas del entrenador ni estadísticas de otros niños.
- Los informes están limitados a ocho actividades recientes por jugador
  dentro de los últimos 120 eventos aplicables consultados. No son una
  estadística histórica de toda la temporada.
- Si se suspende la escuela, membresía o contacto, o se inactiva el vínculo
  o jugador, deja de mostrarse en el portal con ese rol.

## Pruebas pendientes antes de uso real
- MongoDB Atlas/replica set de prueba con dos escuelas, hermanos, invitaciones
  vencidas/reutilizadas, cuentas ya existentes y contacto cuyo correo cambió.
- Intentos de consulta con IDs de otra escuela, cuentas sin vínculo y enlaces
  usados; probar desactivar contacto/escuela/jugador.
- Correo SMTP con credenciales **nuevas**, jamás las expuestas anteriormente.
- Accesibilidad y prueba del portal en teléfono; paginación y políticas de
  retención/consentimiento para información deportiva de menores.

No hay cobros ni notificaciones familiares conectadas aún. El portal no está
desplegado; es código de desarrollo en un Pull Request en borrador.
