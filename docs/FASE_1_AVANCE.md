# Fase 1 - Avance técnico (rama feature/base-multiescuela-seguridad)

## Realizado en esta rama
- .gitignore y .env.example sin valores secretos.
- Desversionados del árbol ACTUAL de esta rama: .env, db/ y node_modules/.
- Arquitectura, responsabilidades y criterios de aceptación multiescuela documentados.
- Modelo Escuela (nombre, slug, estado y branding validado); modelo preparatorio de Membresia; variables CSS de marca.

## Aún NO resuelto
- Los secretos y datos personales siguen presentes en la rama main, en el otro repositorio y en el historial. Requieren revocación, remoción y revisión de exposición.
- Ningún modelo nuevo está conectado a rutas o migraciones. No se puede afirmar que ya exista aislamiento multiescuela.
- No se han ejecutado pruebas integradas, migración de BD ni despliegue.
- Los roles actuales usan modelos independientes (director, entrenador, apoderado). El modelo Membresia requiere decidir y construir una identidad Usuario y vincular los datos históricos.
- No se han incorporado endpoints públicos para crear escuelas o subir logos: primero implementar autenticación/autoridad y manejo seguro de archivos.

## Siguiente entrega
1. Revocar secretos expuestos y retirar datos sensibles de ambas ramas públicas e historial tras respaldo privado.
2. Asegurar recuperación de cuentas, contraseñas y endpoints existentes; añadir pruebas automatizadas de permisos.
3. Diseñar migración idempotente de una escuela piloto con datos exclusivamente ficticios.
4. Exponer la marca pública por slug seguro; edición solo para directores autorizados, con validación de imágenes.
