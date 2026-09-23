# Ejecutar la nueva plataforma multiescuela en VS Code (Windows)

> Solo para desarrollo privado y **datos ficticios**. No desplegar esta rama ni conectar la
> base de datos original hasta remediar las claves y datos que quedaron en GitHub público.

## 1. Requisitos
- Visual Studio Code y Git.
- Node.js **22** (misma versión usada por GitHub Actions) y npm.
- MongoDB Atlas de pruebas o un MongoDB local configurado como replica set
  para probar altas transaccionales de invitaciones/jugadores.
- Navegador Chrome o Edge.

En VS Code > Terminal > Nuevo terminal, comprobar:

```powershell
git --version
node -v
npm -v
```

## 2. Descargar LA RAMA NUEVA (no el main antiguo)

Elige una carpeta de trabajo donde no tengas ya el proyecto antiguo:

```powershell
cd "$HOME\Desktop"
git clone --branch feature/base-multiescuela-seguridad --single-branch https://github.com/Danielreyes95/Proyecto_de_Titulo.git Proyecto_Multiescuela
cd Proyecto_Multiescuela
code .
```

Si ya existe `Proyecto_Multiescuela`, selecciona otro nombre para evitar
sobrescribir trabajos. **No copies .env ni db/ antiguos.**

Instalar las dependencias y ejecutar las pruebas:

```powershell
npm ci
npm test
```

## 3. Base MongoDB EXCLUSIVAMENTE de pruebas

Crear un proyecto/base nuevos para pruebas, con credenciales nuevas, usuario
con permisos limitados y acceso de red restringido a tu IP. No habilitar
acceso desde todas las IPs. Copiar la URI de conexión proporcionada por Atlas
y elegir una base explícita, por ejemplo `escuela_multiescuela_test`.
**No enviar URI ni contraseñas en el chat, capturas o commits.**

## 4. Configurar el entorno privado

En terminal PowerShell, desde la raíz del proyecto:

```powershell
Copy-Item .env.example .env
```

Abrir `.env` desde VS Code y establecer al menos:

```dotenv
PORT=3000
NODE_ENV=development
MONGO_URI=<URI_NUEVA_DE_LA_BASE_DE_PRUEBAS>
JWT_SECRET=<SECRETO_ALEATORIO_1>
PLATFORM_JWT_SECRET=<SECRETO_ALEATORIO_2>
SCHOOL_JWT_SECRET=<SECRETO_ALEATORIO_3>
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
LEGACY_API_ENABLED=false
BOOTSTRAP_ADMIN_EMAIL=<CORREO_PROPIO_PARA_PRUEBAS>
BOOTSTRAP_ADMIN_PASSWORD=<CONTRASEÑA_NUEVA_MINIMO_16_CARACTERES>
```

Para generar cada secreto, ejecutar **tres veces** en PowerShell:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Usar uno distinto por cada variable. No pegar el comando generado ni
subir `.env` a GitHub. Las variables de Mercado Pago y SMTP pueden
permanecer vacías al probar únicamente el panel del superadministrador
y la creación de escuelas; las invitaciones sí requieren SMTP nuevo.

## 5. Crear tu superadministrador e iniciar

```powershell
npm run admin:create
```

Si indica «la cuenta ya existe», no ejecutar cambios sobre la base de
datos original; verificar si ya se creó en esta base de prueba.

**Quitar de `.env` la contraseña `BOOTSTRAP_ADMIN_PASSWORD` después de crear
la cuenta** (y el correo de bootstrap si no volverás a crear cuentas).
No afecta el inicio de sesión de la cuenta que quedó guardada.

```powershell
npm run dev
```

Abrir en el navegador:
- `http://localhost:3000/plataforma.html`: superadministrador.
- `http://localhost:3000/director-acceso.html`: acceso de directores y entrenadores
  una vez invitados.
- `http://localhost:3000/demo-visual.html`: demostración sin base de datos.

No utilizar la extensión **Live Server** para probar la aplicación funcional:
sirve archivos HTML, pero NO ejecuta la API Express ni conecta MongoDB.

## 6. Primer recorrido recomendado

1. Iniciar con el superadministrador en `/plataforma.html`.
2. Crear una escuela **ficticia** con slug `los-leones-prueba`.
3. Personalizar el nombre y colores, guardar y actualizar.
4. Para probar invitaciones, configurar `EMAIL_USER` y `EMAIL_PASS`
   con credenciales SMTP nuevas. El director deberá ser un correo de prueba
   controlado por ti y aceptar el enlace de activación.
5. Ingresar con el director, crear categorías, entrenador, apoderados y
   jugadores ficticios. Después, probar Modo cancha e Informes.

## Diagnóstico rápido

| Síntoma | Comprobar |
| --- | --- |
| `git` / `node` no reconocido | Instalación de Git / Node; reiniciar terminal |
| `MONGO_URI no está definido` | Nombre del archivo `.env`, ubicado en la raíz |
| MongoDB timeout / autenticación | IP permitida, URI nueva, usuario y contraseña |
| Error `EADDRINUSE: 3000` | Otro servidor ocupa el puerto; usar PORT=3001 y ajustar FRONTEND_URL, BACKEND_URL, CORS_ORIGINS |
| `404` en `/api/auth` | Esperado: backend antiguo deshabilitado por defecto |
| La invitación no llega | Configuración SMTP nueva, correo no bloqueado, FRONTEND_URL local |
| Error de transacción MongoDB | Usar Atlas/replica set; MongoDB standalone no admite estas transacciones |

Antes de pasar a producción: corregir exposición histórica de credenciales/datos
en AMBOS repositorios, ejecutar pruebas reales con dos escuelas, revisar permisos
y seguridad, y realizar migración respaldada de la base antigua.
