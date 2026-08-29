# Hay Fulbo

Hay Fulbo es una aplicación para organizar partidos de fútbol recurrentes.
Permite administrar grupos, convocar jugadores, armar equipos, registrar cada
partido y consultar las estadísticas del grupo.

El repositorio contiene la aplicación web, una app móvil en Expo y los paquetes
compartidos del backend.

## Qué incluye

- Grupos con jugadores, canchas, permisos e invitaciones.
- Partidos con asistencia, equipos, goles, rendimiento, pagos y resultados.
- Historial, rankings y estadísticas por jugador o partido.
- Páginas públicas para compartir grupos, jugadores y partidos.

## Stack

Next.js, React, TypeScript, Tailwind CSS, Expo, React Native, tRPC, React Query,
Better Auth, PostgreSQL, Drizzle ORM, Bun y Turborepo.

## Desarrollo local

Necesitas [Bun](https://bun.sh/) 1.3.3 o compatible y
[Docker](https://docs.docker.com/get-docker/) para PostgreSQL. Para la app
nativa, también necesitas Xcode o Android Studio.

Desde la raíz del repositorio:

```bash
cp .env.example .env
bun install
bun run db:start
bun run db:migrate
bun run dev:web
```

Abre <http://localhost:3001>. `db:start` levanta PostgreSQL y `db:migrate`
aplica las migraciones versionadas. Para levantar web y móvil al mismo tiempo,
usa `bun run dev`.

### Variables de entorno

Usa [.env.example](.env.example) como base. La aplicación necesita
`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `RUNTIME_DATABASE_PASSWORD`,
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y `CORS_ORIGIN`. Las contraseñas y el
secreto de autenticación deben tener al menos 32 caracteres.

El correo es opcional. Configura `RESEND_API_KEY` y `EMAIL_FROM` para enviar
verificaciones e invitaciones mediante Resend. Sin esas variables, las
invitaciones se comparten mediante links.

Para la app nativa, agrega `EXPO_PUBLIC_SERVER_URL`:

```dotenv
EXPO_PUBLIC_SERVER_URL=http://localhost:3001
```

En un emulador Android usa normalmente `http://10.0.2.2:3001`. En un teléfono,
usa la IP local de tu máquina.

## Comandos frecuentes

```bash
bun run dev:web          # solo web
bun run dev:native       # solo Expo
bun run check            # lint, formato y tipos
bun test                 # pruebas unitarias
bun run test:integration # pruebas contra PostgreSQL
bun run test:e2e         # pruebas E2E con Playwright
bun run build            # build de todas las aplicaciones
```

Para trabajar con la base de datos:

```bash
bun run db:generate  # generar una migración
bun run db:migrate   # aplicar migraciones versionadas
bun run db:push      # sincronizar el esquema en desarrollo
bun run db:studio    # abrir Drizzle Studio
```

Las pruebas de integración requieren `MATCH_TEST_DATABASE_URL`. Las pruebas E2E
usan el puerto `3013` por defecto y aceptan una base alternativa mediante
`E2E_DATABASE_URL`.

## Estructura

```text
hay-fulbo/
├── apps/
│   ├── web/              # Aplicación Next.js
│   └── native/           # Aplicación Expo / React Native
├── packages/
│   ├── api/              # Router tRPC y reglas de negocio
│   ├── auth/             # Better Auth y correos
│   ├── db/               # Esquema, migraciones y consultas
│   ├── env/              # Variables de entorno
│   └── ui/               # Componentes compartidos
├── ops/                  # Automatización de Coolify y PostgreSQL
├── docs/                 # Planes y documentación operativa
├── docker-compose.yml    # PostgreSQL y web en Docker
└── package.json          # Scripts del monorepo
```

Los prototipos descartables están bajo `apps/web/src/app/prototype`.

## Docker

Para levantar PostgreSQL y la aplicación web en contenedores:

```bash
bun run docker:up
```

La aplicación queda disponible en <http://localhost:3001>. Usa
`bun run docker:logs` para ver logs y `bun run docker:down` para detener el
stack. El contenedor ejecuta las migraciones antes de iniciar Next.js.

## Producción

La operación de producción está documentada en
[`ops/coolify/README.md`](ops/coolify/README.md). Ahí están el runbook, las
variables de Coolify y los comandos para planificar, desplegar y verificar un
release.

No guardes secretos, tokens ni archivos `.env` en el repositorio.
