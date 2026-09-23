# Escuela de Fútbol — plataforma multiescuela (en desarrollo)

Este repositorio contiene el Proyecto de Título original y una evolución en la rama
`feature/base-multiescuela-seguridad` hacia una plataforma para administrar
varias escuelas, con usuarios, categorías, entrenadores y jugadores independientes.

> **No desplegar aún para escuelas reales.** Este Pull Request está en borrador.
> Antes de producción deben remediarse la exposición histórica de claves/datos,
> la seguridad del backend anterior y las pruebas de extremo a extremo.

## Funciones nuevas en esta rama

| Interfaz | Dirección local | Uso |
|---|---|---|
| Administración general | `/plataforma.html` | Crear escuelas, invitar director, elegir colores |
| Acceso personal | `/director-acceso.html` | Director / entrenador y selección de escuela |
| Categorías | `/categorias-escuela.html?escuela=<ID>` | Categorías formativas y competitivas |
| Entrenadores | `/entrenadores-escuela.html?escuela=<ID>` | Registrar, asignar e invitar |
| Jugadores | `/jugadores-escuela.html?escuela=<ID>` | Registro y apoderados vinculados |
| Modo cancha | `/registro-rapido.html?escuela=<ID>` | Asistencia y estadísticas con pocos toques |
| Informes | `/estadisticas-escuela.html?escuela=<ID>` | Acumulados por año, categoría y jugador |
| Familias | `/familia-acceso.html` | Acceso mediante invitación y consulta de jugadores vinculados |

Los enlaces internos validan roles/pertenencia también desde el backend.
Los informes únicamente contabilizan eventos cerrados; no trasladan automáticamente
estadísticas de colecciones del proyecto original.

## Ver la interfaz antes de configurar MongoDB

Existe una demostración **autónoma con datos completamente ficticios**:
`public/demo-visual.html`. Descárgala y ábrela en Chrome o Edge. No requiere
Node.js, correo, MongoDB ni cuenta: permite cambiar de escuela, ver el panel,
probar un registro rápido simulado y personalizar los colores.

**No es un despliegue real ni representa datos guardados**: el archivo de prueba
no llama a la API y sus cambios se pierden al recargar.

Para ver **la aplicación funcional de desarrollo**, sigue los pasos de entorno
privado más abajo y abre `http://localhost:3000/plataforma.html` o
`http://localhost:3000/director-acceso.html`. Nunca subas `.env` ni
habilites rutas antiguas con información real.

**En Windows con VS Code:** sigue `docs/INICIAR_EN_VSCODE.md` para instalar dependencias, configurar una base de pruebas, crear tu superadministrador e iniciar la aplicación sin reutilizar contraseñas antiguas.

## Preparar entorno de desarrollo privado

1. Resguardar y aislar los datos existentes. Revocar/renovar claves que ya
   fueron versionadas. **No volver a utilizar credenciales históricas.**
2. En esta rama: `npm ci`.
3. Copiar `.env.example` a `.env` y configurar en el propio computador
   los valores NUEVOS de `MONGO_URI`, `JWT_SECRET`,
   `PLATFORM_JWT_SECRET`, `SCHOOL_JWT_SECRET`, correo y URL local.
   Los tres secretos JWT deben ser únicos; el de plataforma y escuela
   necesitan al menos 32 caracteres. Nunca subir `.env`.
4. Definir temporalmente `BOOTSTRAP_ADMIN_EMAIL` y
   `BOOTSTRAP_ADMIN_PASSWORD` (mínimo 16 caracteres); ejecutar
   `npm run admin:create`; retirar la contraseña de bootstrap del entorno.
5. `npm test` y `npm run dev`. Abrir `http://localhost:3000/plataforma.html`.
6. Crear instituciones y usuarios **solo ficticios** para probar invitaciones,
   categorías, entrenadores, alumnos, actividades, modo cancha e informes.

Las transacciones de invitaciones/alta de jugador requieren MongoDB Atlas o
un replica set compatible. Para probar invitaciones por correo se necesita SMTP
configurado. En producción el backend legacy queda deshabilitado; en desarrollo
solo se habilita bajo `LEGACY_API_ENABLED=true` y `NODE_ENV` distinto de production,
**nunca con clientes reales**.

## Reglas de informes

Los reportes filtran escuela + categoría + año UTC + evento cerrado.
Asistencia = presentes / (presentes + ausentes); «—» = no hay observaciones.
Estadísticas y tarjetas cuentan solo registros presentes. Las notas de
rendimiento no completadas se excluyen del promedio, no se convierten en 0.

Consulta el alcance, fórmulas y pruebas previstas:
- `docs/ARQUITECTURA_MULTIESCUELA.md`
- `docs/REGISTRO_RAPIDO_UX.md`
- `docs/INFORMES_ESTADISTICAS.md`
- `docs/FASE_1_AVANCE.md`
- `docs/SEGURIDAD_INICIAL.md`

## Pendientes antes de producción

Remediación histórica de secretos/datos en ambos repositorios; migración
respaldada de colecciones antiguas; pruebas de aislamiento entre escuelas
con MongoDB, pruebas reales de SMTP y móviles, política de sesiones y límites
compartidos; autorización de apoderados; pagos seguros y subida de escudos/imágenes.
