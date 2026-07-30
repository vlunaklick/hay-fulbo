# Estrategia de despliegue en Coolify

Investigación realizada el 29 de julio de 2026 para resolver la decisión
“Investigar la estrategia de despliegue en Coolify”.

## Decisión recomendada

Desplegar **dos recursos separados dentro del mismo proyecto y ambiente de
Coolify**:

1. una aplicación Git con el build pack **Dockerfile**, usando el contexto de
   la raíz del monorepo y `apps/web/Dockerfile`;
2. una base de datos **PostgreSQL administrada como recurso nativo de
   Coolify**, accesible por su URL interna.

Mantener `docker-compose.yml` para desarrollo local, no como unidad de
producción. Docker Compose es una opción soportada para stacks con varios
servicios, pero Coolify no ofrece rolling updates para ese tipo de despliegue.
Una aplicación Dockerfile independiente sí puede conservar el contenedor
anterior hasta que el nuevo esté sano y también admite rollback a una imagen
local anterior. Esa diferencia hace que separar aplicación y base sea apenas
más configuración inicial, pero una operación mucho más segura
([build packs](https://coolify.io/docs/applications/build-packs),
[rolling updates](https://coolify.io/docs/knowledge-base/rolling-updates),
[rollbacks](https://coolify.io/docs/applications/)).

## Por qué encaja con este repositorio

- El monorepo ya tiene un Dockerfile multi-stage que construye desde la raíz,
  ejecuta el build de `apps/web` y arranca con Node en el puerto 3001
  ([Dockerfile actual](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/apps/web/Dockerfile)).
- Next.js ya usa `output: "standalone"`
  ([configuración actual](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/apps/web/next.config.ts#L4-L8)).
  Next.js genera así un servidor mínimo y sus dependencias trazadas; `public`
  y `.next/static` deben copiarse aparte, como ya hace el Dockerfile
  ([documentación oficial de Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)).
- Bun recomienda instalar desde `package.json` y `bun.lock` en una etapa de
  build y separar la imagen final; el Dockerfile existente sigue esa idea,
  aunque conviene agregar `--frozen-lockfile`
  ([guía oficial de Bun](https://bun.sh/docs/guides/ecosystem/docker)).
- El Compose actual publica tanto web como PostgreSQL al host, fija un nombre
  de contenedor para PostgreSQL y acopla ambos ciclos de vida
  ([Compose actual](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/docker-compose.yml)).
  Coolify advierte que los port mappings hacen perder rolling updates y que
  Docker Compose no los soporta
  ([aplicaciones](https://coolify.io/docs/applications/),
  [rolling updates](https://coolify.io/docs/knowledge-base/rolling-updates)).

## Configuración concreta en Coolify

### PostgreSQL

Crear primero un recurso PostgreSQL en el mismo proyecto, ambiente, servidor y
destino que la aplicación. No habilitar acceso público salvo para una tarea
operativa temporal y controlada. Coolify ofrece una URL interna cuando
aplicación y base comparten red; si no comparten red obliga a usar una URL
pública, por lo que la co-localización es parte de esta decisión
([bases de datos en Coolify](https://coolify.io/docs/databases/)).

Usar un nombre de base y usuario dedicados. La contraseña debe generarla y
custodiarla Coolify, no el repositorio.

### Aplicación

| Campo | Valor |
| --- | --- |
| Fuente | repositorio GitHub `vlunaklick/hay-fulbo` |
| Rama de producción | `main` |
| Build pack | `Dockerfile` |
| Base Directory | `/` |
| Dockerfile Location | `/apps/web/Dockerfile` |
| Port Exposes | `3001` |
| Port Mappings | vacío |
| Dominio | URL HTTPS final |
| Auto deploy | habilitado para `main`, después del primer despliegue manual validado |

La raíz debe seguir siendo el contexto: el Dockerfile copia todo el monorepo y
Bun resuelve workspaces. Coolify soporta base directory para monorepos, una
ubicación de Dockerfile propia y configuración del puerto
([Dockerfile build pack](https://coolify.io/docs/applications/build-packs/dockerfile),
[API de creación](https://coolify.io/docs/api-reference/api/applications/create-public-application)).

### Variables

Definir en Coolify, como **runtime-only**:

```dotenv
DATABASE_URL=<URL interna entregada por el recurso PostgreSQL>
BETTER_AUTH_SECRET=<secreto aleatorio de al menos 32 caracteres>
BETTER_AUTH_URL=https://<dominio-final>
CORS_ORIGIN=https://<dominio-final>
NODE_ENV=production
```

El código valida exactamente esas variables
([esquema de entorno](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/packages/env/src/server.ts#L5-L15)).
Hoy no existen variables web públicas. Si más adelante aparece una
`NEXT_PUBLIC_*`, deberá habilitarse también en build porque Next.js la inserta
en el bundle. Coolify permite separar flags de build y runtime; mantener los
secretos fuera del build evita exponerlos en metadatos o capas
([variables de entorno](https://coolify.io/docs/knowledge-base/environment-variables)).

El Dockerfile ya evita necesitar secretos reales durante `next build` mediante
validación omitida y un placeholder de autenticación. El secreto real llega
solamente al contenedor en ejecución.

## Migraciones

La estrategia de producción debe ser de **migraciones SQL versionadas**, no
`db:push`:

1. generar cambios con `bun run db:generate` durante desarrollo;
2. revisar y commitear `packages/db/src/migrations`;
3. ejecutar `db:migrate` una sola vez por release, antes de iniciar el servidor;
4. iniciar Next.js solo si la migración termina correctamente.

Drizzle `migrate` lee archivos SQL, compara el historial de
`__drizzle_migrations`, aplica solo lo pendiente y registra lo aplicado
([documentación oficial de Drizzle](https://orm.drizzle.team/docs/drizzle-kit-migrate)).
El repo ya declara `db:generate`, `db:migrate` y la carpeta de salida
([scripts](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/package.json#L30-L40),
[configuración Drizzle](https://github.com/vlunaklick/hay-fulbo/blob/2193485e7daa80889c5277fa80a99a85f588380d/packages/db/drizzle.config.ts#L8-L15)).

**Cambio previo obligatorio:** la imagen runner actual solo contiene el
standalone de Next.js, estáticos y `public`; no contiene Bun, Drizzle Kit ni la
carpeta de migraciones. Por lo tanto, `bun run db:migrate` no puede funcionar
en producción todavía. La implementación debe incorporar a la imagen final un
runner mínimo de migraciones y un entrypoint del tipo:

```text
ejecutar migraciones && exec node apps/web/server.js
```

No usar como mecanismo principal los comandos pre/post deployment de Coolify.
El pre-deployment corre dentro del contenedor **existente**, que no tiene las
migraciones nuevas; el post-deployment corre en el nuevo contenedor
**después** de completar el despliegue
([Dockerfile build pack](https://coolify.io/docs/applications/build-packs/dockerfile#prepost-deployment-commands)).
Se infiere de ese orden que ninguno garantiza por sí solo “migrar antes de que
la nueva aplicación reciba tráfico”.

Para conservar rollback de aplicación, los cambios de esquema deben seguir el
patrón expand/contract: primero agregar estructuras compatibles con código
viejo y nuevo; eliminar o volver incompatible solo en un release posterior.
El rollback de imagen no revierte la base de datos.

## Health check y actualizaciones

Agregar un endpoint dedicado, por ejemplo `GET /api/health`, que:

- responda 200 solo si el proceso está listo;
- ejecute una consulta mínima a PostgreSQL (`select 1`);
- no requiera sesión ni devuelva secretos.

Agregar un `HEALTHCHECK` al Dockerfile que use el Node ya presente para pedir
`http://127.0.0.1:3001/api/health`. Esto evita depender de `curl`/`wget` en la
imagen slim. Si existen checks tanto en UI como en Dockerfile, Coolify da
precedencia al Dockerfile; para una aplicación sana, Traefik enruta tráfico y
el rolling update espera a que pase
([health checks](https://coolify.io/docs/knowledge-base/health-checks),
[rolling updates](https://coolify.io/docs/knowledge-base/rolling-updates)).

Mantener:

- nombre de contenedor generado por Coolify;
- `Port Exposes=3001`, sin mapping al host;
- health check habilitado;
- un `start_period` suficiente para migración + arranque.

Esas son condiciones explícitas de Coolify para el rolling update. El check
actual de Compose contra `/` sirve solo para desarrollo y no prueba la base.

## Persistencia y backups

La aplicación web debe ser stateless: no necesita volumen mientras archivos y
datos vivan en PostgreSQL. Si luego se agregan uploads locales, deben ir a
object storage o a un volumen explícito; Coolify preserva datos entre
deployments mediante volúmenes o bind mounts
([persistent storage](https://coolify.io/docs/knowledge-base/persistent-storage)).

Para PostgreSQL:

- habilitar backup completo diario;
- guardar una copia externa en almacenamiento S3-compatible;
- usar una retención inicial de 7 copias locales y 30 diarias externas;
- ejecutar y documentar una restauración de prueba antes del lanzamiento y
  luego periódicamente.

Coolify programa backups por cron, usa un dump completo de PostgreSQL, admite
retención y almacenamiento S3-compatible
([backups](https://coolify.io/docs/databases/backups),
[API de backups](https://coolify.io/docs/api-reference/api/databases/create-database-backup)).
Un backup que nunca se restauró no debe considerarse verificado.

## Despliegue, fallo y rollback

Secuencia del primer despliegue:

1. crear PostgreSQL y configurar backup;
2. agregar los cambios obligatorios de migración y health check a la imagen;
3. crear la aplicación Dockerfile y cargar variables runtime;
4. desplegar manualmente;
5. comprobar health, login, escritura/lectura y una migración real;
6. verificar un backup y su restauración;
7. habilitar auto deploy de `main`.

En releases posteriores, la nueva imagen migra, arranca y queda disponible
solo al pasar el health check; entonces Coolify retira la anterior. Si falla:

1. detener/promover el release fallido;
2. usar el rollback de Coolify a una imagen local anterior;
3. no ejecutar una migración “down” automáticamente;
4. restaurar PostgreSQL solo ante corrupción o cambio destructivo, aceptando
   la pérdida de datos posterior al backup.

Coolify limita su rollback a imágenes aún disponibles localmente. La política
de limpieza del host debe conservar al menos las últimas imágenes de
producción; para recuperación más larga, fijar el commit anterior y
redesplegarlo
([rollbacks](https://coolify.io/docs/applications/)).

## Cambios requeridos antes de desplegar

Esta investigación no los implementa, pero deja la ruta cerrada:

1. congelar instalaciones con `bun install --frozen-lockfile`;
2. incluir runner + archivos de migración en la imagen y ejecutarlos antes de
   Next.js;
3. agregar `/api/health` y `HEALTHCHECK`;
4. documentar las variables y la operación de restore;
5. validar el build en CI o Coolify.

La prueba local `docker build -f apps/web/Dockerfile .` no llegó a ejecutar
instrucciones del repositorio: el Docker Engine local quedó esperando
metadatos de `node:24-slim` y la prueba se canceló. Por eso este documento no
afirma que el build actual esté validado; solo que su estructura coincide con
la estrategia soportada.

## Criterio de aceptación operativo

- el build parte de un checkout limpio y del `bun.lock` commiteado;
- una base vacía llega al esquema esperado sin intervención manual;
- una segunda ejecución de migraciones no cambia nada;
- `/api/health` falla si PostgreSQL no responde;
- un release roto no reemplaza al contenedor sano;
- puede volver a desplegarse una imagen anterior;
- el backup externo existe y una restauración de prueba termina correctamente.
