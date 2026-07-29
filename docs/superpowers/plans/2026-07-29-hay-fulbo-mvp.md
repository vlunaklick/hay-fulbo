# Hay Fulbo MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Hay Fulbo como una PWA responsive, multi-grupo y desplegada en Coolify, donde responsables, organizadores y capitanes gestionan partidos y cualquier invitado con enlace privado consulta resultados, aportes y estadísticas.

**Architecture:** Next.js 16 es la única aplicación cliente y servidor. tRPC expone casos de uso, `packages/db` concentra transacciones, alcance RLS y consultas, Better Auth Organization representa los Grupos y PostgreSQL conserva todo el dominio ya creado por `#18`; la Vista compartida usa una capacidad propia y nunca una sesión falsa. La UI se reimplementa sobre datos reales tomando solo el flujo/arquitectura de información de los prototipos, con tema oscuro simple y mobile-first según `DESIGN.md`.

**Tech Stack:** Bun 1.3.3, TypeScript, Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui, tRPC 11, TanStack Query 5, Better Auth 1.6.25 Organization, Drizzle ORM, PostgreSQL 18, Bun Test, Playwright, axe-core, Docker y Coolify.

---

## Contrato de ejecución

- `main` es la rama de integración y producción. Cada ticket se implementa en una rama corta, se verifica y se integra a `main` sin review gate humano.
- Ejecutar un agente fresco por ticket. Los tickets desbloqueados pueden correr en paralelo; el agente integrador resuelve solapamientos y ejecuta la batería completa después de cada merge.
- No reimplementar `#18 Implementar el núcleo de dominio y persistencia`. Sus tablas, migración, RLS, guards SQL y reglas públicas de `@hay-fulbo/db/matches` son la base. Las tareas siguientes agregan casos de uso, queries, interfaz y operación.
- Los prototipos `43304a3` y `6e90e3d` fijan flujo e IA, no estética ni código reutilizable. No cherry-pickearlos. Reimplementar la “Mesa de control” y “El vestuario” con datos reales y la dirección visual de `PRODUCT.md`/`DESIGN.md`.
- Tema oscuro por defecto, sin selector de tema en el MVP. Una acción verde dominante por vista, pocas superficies, sin dashboard de tarjetas, sin gradientes, glassmorphism o neón.
- No escribir `useEffect` directamente. Preferir estado derivado, eventos, Server Components, TanStack Query y `useSyncExternalStore` cuando corresponda.
- BigInt cruza HTTP/tRPC como string decimal. Fechas cruzan como ISO 8601. El cliente nunca decide `groupId`, permisos, marcador, aporte esperado ni estadísticas.
- Cada mutación acepta `lockVersion`; conflicto concurrente devuelve `CONFLICT` y obliga a refrescar. No se hace last-write-wins silencioso.

## Dependencias y orden

```text
Núcleo #18 (hecho)
├── A. Acceso seguro y gestión de grupos
│   └── B. Comandos transaccionales de partidos
│       ├── C. Dashboard compartido y estadísticas
│       └── D. Shell oscuro y flujos móviles
│           └── E. Hardening integral
│               └── G. Provisionar y lanzar en Coolify
└── F. Imagen productiva y migraciones de arranque
    └── E. Hardening integral
        └── G. Provisionar y lanzar en Coolify
```

`F` puede comenzar en paralelo con `A`. `C` y el trabajo de shell/base visual de `D` pueden avanzar en paralelo después de `A`; el flujo editable de `D` espera los contratos de `B`. `G` empieza únicamente con `E` y `F` integrados.

## Mapa de archivos

### Infraestructura de pruebas y configuración

- Modify: `package.json` — scripts raíz `test`, `test:unit`, `test:integration`, `test:e2e` y dependencias Playwright/axe.
- Modify: `turbo.json` — tareas `test` y `check-types` completas, no persistentes.
- Create: `docker-compose.test.yml` — PostgreSQL 18 y Mailpit aislados para integración/E2E, sin reutilizar datos de desarrollo.
- Create: `playwright.config.ts` — proyectos móvil 390×844 y escritorio 1280×800, servidor web y variables de test.
- Create: `tests/e2e/fixtures.ts` — usuarios, grupos, jugadores, cancha y limpieza determinista.

### Acceso y Grupos

- Modify: `packages/auth/src/index.ts` — verificación de email, reset, Organization y hooks de invitación.
- Create: `packages/auth/src/email.ts` — puerto de envío SMTP; Mailpit en tests, secretos solo en runtime.
- Modify: `packages/env/src/server.ts` — variables de runtime para URLs de DB separadas y SMTP.
- Modify: `apps/web/src/lib/auth-client.ts` — cliente Organization.
- Modify: `packages/api/src/context.ts` — sesión, capacidad compartida y dependencias inyectables.
- Modify: `packages/api/src/index.ts` — procedures autenticado, miembro, responsable, autoridad de partido y lectura compartida.
- Create: `packages/api/src/authz/group-access.ts` — resolución de membresía/owner sin confiar en `activeOrganizationId`.
- Create: `packages/api/src/services/groups.ts` — jugadores, canchas, vínculos, archivo, membresías y enlace compartido.
- Create: `packages/api/src/services/shared-links.ts` — secreto de 256 bits, hash, cookie e invalidación.
- Create: `packages/api/src/routers/groups.ts` — API tRPC de Grupo.
- Create: `packages/api/src/routers/shared.ts` — queries públicas de capacidad; ninguna mutación.
- Create: `packages/api/src/routers/groups.integration.test.ts` — aislamiento, roles, vínculos y último Responsable.
- Create: `packages/api/src/routers/shared.integration.test.ts` — intercambio/rotación/revocación y ausencia de datos sensibles.
- Modify: `packages/api/src/routers/index.ts` — componer routers reales y quitar endpoints demo.
- Create: `apps/web/src/app/api/shared/exchange/route.ts` — intercambio POST de fragmento por cookie HttpOnly.

### Partido y estadísticas

- Modify: `packages/db/src/matches.ts` — exportar comandos/queries nuevos sin duplicar reglas puras existentes.
- Create: `packages/db/src/matches/scope.ts` — `SET LOCAL app.group_id`, rol runtime y transacciones acotadas.
- Create: `packages/db/src/matches/commands.ts` — comandos de intención, locks, autorización y auditoría.
- Create: `packages/db/src/matches/queries.ts` — lectura de detalle/colecciones con marcador y aportes derivados.
- Create: `packages/db/src/matches/commands.integration.test.ts` — autoridad, transiciones, prorrateo, cierre y concurrencia.
- Create: `packages/db/src/stats.ts` — seam público de estadísticas.
- Create: `packages/db/src/stats/queries.ts` — CTEs de cerrados, filtros y desempates.
- Create: `packages/db/src/stats/queries.integration.test.ts` — agregados y reapertura.
- Create: `packages/api/src/routers/matches.ts` — inputs Zod y adaptación tRPC a comandos.
- Create: `packages/api/src/routers/stats.ts` — filtros de fecha/cancha/jugador.
- Create: `packages/api/src/routers/matches.integration.test.ts` — matriz organizador/capitán/miembro.

### UI real

- Modify: `packages/ui/src/styles/globals.css` — tokens exactos de `DESIGN.md`, tema oscuro raíz y reduced motion.
- Modify: `apps/web/src/app/layout.tsx` — Manrope, metadata española, dark root y shell semántico.
- Modify: `apps/web/src/components/providers.tsx` — quitar selector/sistema y fijar dark.
- Delete: `apps/web/src/components/mode-toggle.tsx` — no hay tema alternativo en el MVP.
- Modify: `apps/web/src/components/header.tsx` — encabezado compacto, Grupo activo y menú accesible.
- Create: `apps/web/src/components/app-shell.tsx` — top bar + navegación inferior móvil.
- Create: `apps/web/src/components/page-state.tsx` — loading/error/empty consistentes.
- Create: `apps/web/src/components/money.tsx` — formato ARS desde minor units.
- Create: `apps/web/src/app/(auth)/login/page.tsx` — login/registro/verificación/recuperación.
- Create: `apps/web/src/app/(app)/layout.tsx` — sesión y membresía requeridas.
- Create: `apps/web/src/app/(app)/grupos/page.tsx` — selector/creación de Grupo.
- Create: `apps/web/src/app/(app)/grupo/[groupId]/page.tsx` — resumen operativo.
- Create: `apps/web/src/app/(app)/grupo/[groupId]/jugadores/page.tsx` — alta/archivo/vínculo.
- Create: `apps/web/src/app/(app)/grupo/[groupId]/canchas/page.tsx` — alta/archivo de Canchas.
- Create: `apps/web/src/app/(app)/grupo/[groupId]/acceso/page.tsx` — membresías, invitaciones y Vista compartida.
- Create: `apps/web/src/app/(app)/grupo/[groupId]/partidos/nuevo/page.tsx` — creación simple.
- Create: `apps/web/src/app/(app)/grupo/[groupId]/partidos/[matchId]/page.tsx` — Mesa de control real.
- Create: `apps/web/src/features/matches/match-control.tsx` — tabs Datos/Equipos/Caja/Juego/Cierre.
- Create: `apps/web/src/features/matches/roster-panel.tsx` — jugadores existentes/nuevos y capitanes.
- Create: `apps/web/src/features/matches/contributions-panel.tsx` — esperado/pagado/estado.
- Create: `apps/web/src/features/matches/appearances-panel.tsx` — goles/asistencias/autogoles/sin autor.
- Create: `apps/web/src/features/matches/closure-panel.tsx` — checklist, cierre, reapertura y cancelación.
- Create: `apps/web/src/app/compartido/page.tsx` — landing limpia que consume `#secreto`.
- Create: `apps/web/src/app/compartido/grupo/page.tsx` — feed “El vestuario” real.
- Create: `apps/web/src/features/shared/shared-dashboard.tsx` — próximo partido, caja, ranking e historial.
- Create: `apps/web/src/features/shared/stat-filters.tsx` — período, Cancha y resultado.
- Create: `apps/web/src/features/shared/match-detail.tsx` — detalle de partido solo lectura.
- Create: `apps/web/src/proxy.ts` — headers no-store/no-referrer/noindex de `/compartido`.
- Create: `apps/web/src/app/robots.ts` — excluir `/compartido`.
- Modify: `apps/web/src/app/manifest.ts` — nombre, colores oscuros y `start_url` existente.

### Producción

- Create: `packages/db/src/migrate.ts` — runner Drizzle contra `DATABASE_MIGRATION_URL`.
- Create: `apps/web/docker-entrypoint.sh` — migrar, borrar credencial elevada del entorno y ejecutar Node.
- Create: `apps/web/src/app/api/health/route.ts` — readiness real con `select 1`.
- Modify: `apps/web/Dockerfile` — Bun 1.3.3, lockfile congelado, runner/migraciones y HEALTHCHECK.
- Modify: `docker-compose.yml` — sintaxis compatible con Compose 2.13, DB no pública por defecto y health real.
- Create: `ops/coolify/reconcile.mjs` — reconciliar proyecto, ambiente, PostgreSQL, roles, app, variables y backups sin imprimir secretos.
- Create: `ops/coolify/deploy.mjs` — fijar SHA, disparar una vez, esperar terminal y smoke/rollback.
- Create: `ops/coolify/smoke.mjs` — health ×3, HTTPS, sesión anónima y commit.
- Create: `ops/coolify/README.md` — precondiciones, comandos, restore drill, evidencias y rollback.
- Create: `docs/releases/production.md` — FQDN, SHA, UUID, migración, backup/restore y smoke; nunca secretos.

## Tracer bullets TDD

### Task 1: Acceso seguro y gestión de Grupos

**Depends on:** núcleo `#18`.

**Files:** todos los archivos de “Acceso y Grupos” y la parte de test harness necesaria.

- [ ] **Step 1: Crear el arnés de integración aislado**

Agregar `docker-compose.test.yml`, script `test:integration` y una utilidad que cree una base por suite, aplique `0000_damp_lightspeed.sql` y conecte con un rol runtime `NOSUPERUSER NOBYPASSRLS`.

Run:

```bash
docker compose -f docker-compose.test.yml up -d --wait
bun run test:integration
```

Expected: FAIL porque todavía no existen los routers/guards de Grupo; PostgreSQL y Mailpit quedan healthy.

- [ ] **Step 2: Escribir primero la matriz de acceso**

En `groups.integration.test.ts` cubrir:

```ts
test("a non-member cannot read a group even when it is active", async () => {
  const result = memberB.groups.get({ groupId: groupA.id });
  await expect(result).rejects.toMatchObject({ code: "FORBIDDEN" });
});

test("the last owner cannot leave or be demoted", async () => {
  await expect(owner.groups.removeMember({ groupId, userId: owner.id }))
    .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
});

test("linking a user to a player grants no match authority", async () => {
  await owner.groups.linkPlayer({ groupId, playerId, userId: member.id });
  await expect(member.matches.updateDetails({ groupId, matchId, lockVersion: 0 }))
    .rejects.toMatchObject({ code: "FORBIDDEN" });
});
```

Agregar casos de owner/member, invitación 48 h, email verificado, pertenencia cruzada, archivo de Jugador/Cancha y cambio de Grupo activo.

Run:

```bash
bun test packages/api/src/routers/groups.integration.test.ts
```

Expected: FAIL con imports/procedures ausentes.

- [ ] **Step 3: Implementar el seam de autorización**

`group-access.ts` debe exponer únicamente:

```ts
export type GroupActor = {
  userId: string;
  groupId: string;
  membershipRole: "owner" | "member";
};

export async function requireGroupMember(input: {
  db: Database;
  userId: string;
  groupId: string;
}): Promise<GroupActor>;

export async function requireGroupOwner(input: {
  db: Database;
  userId: string;
  groupId: string;
  recentSessionRequired?: boolean;
}): Promise<GroupActor>;
```

Resolver la membresía desde DB en cada operación; `session.activeOrganizationId` solo selecciona UI. Normalizar nombres en servidor. Validar URL de Maps, moneda ISO e IANA.

Run:

```bash
bun test packages/api/src/routers/groups.integration.test.ts
```

Expected: casos de aislamiento/roles PASS; fallan los de Vista compartida.

- [ ] **Step 4: Implementar la capacidad compartida**

Crear 32 bytes con `crypto.randomBytes`, persistir solo SHA-256 y generar cookie `hf_shared` HttpOnly, SameSite=Lax, Path=/compartido, 30 días y Secure en producción. `POST /api/shared/exchange` acepta solo `{ token }`, resuelve el Grupo mediante `hay_fulbo_resolve_shared_group`, establece la cookie y jamás devuelve el token.

Pruebas obligatorias:

- el token no aparece en DB, cookie serializada, logs ni respuesta;
- la cookie no puede elegir otro Grupo;
- rotar/revocar invalida token y cookie en el request siguiente;
- una respuesta compartida no contiene email, user, member, invitation, eventos, hashes ni configuración;
- GET/POST/PUT/PATCH/DELETE no autorizados responden 401/403 sin mutar.

Run:

```bash
bun test packages/api/src/routers/shared.integration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Completar Better Auth Organization**

Configurar plugin Organization en cliente; activar verificación y recuperación con un adaptador SMTP. En tests, capturar el correo en Mailpit y seguir el link. En producción fallar al arrancar si faltan `SMTP_URL` o `AUTH_EMAIL_FROM`; nunca loguear URLs con token. Mantener invitaciones solo `member`, 48 horas, reenvío reemplazante y promoción owner posterior con sesión reciente.

Run:

```bash
bun test packages/api/src/routers/groups.integration.test.ts
bun run check-types
```

Expected: todos PASS, incluido registro → verificar → aceptar invitación.

- [ ] **Step 6: Commit boundary A**

```bash
git add package.json turbo.json docker-compose.test.yml packages/auth packages/env/src/server.ts packages/api apps/web/src/lib/auth-client.ts apps/web/src/app/api/shared/exchange/route.ts
git commit -m "feat: add secure group access"
```

Expected: un commit autocontenido; no incluye UI de partidos ni cambios de imagen.

### Task 2: Comandos transaccionales de Partidos

**Depends on:** Task 1 y núcleo `#18`.

**Files:** todos los archivos de “Partido” salvo estadísticas.

- [ ] **Step 1: Escribir tests de comando antes del servicio**

Cubrir `createMatch`, `updateDetails`, `updateTeams`, `addAppearance`, `removeAppearance`, `setExpectedContribution`, `setPaidContribution`, `setSportingTotals`, `closeMatch`, `reopenMatch`, `cancelMatch`, `restoreMatch` y `transferOrganizer`.

Casos mínimos:

- creación atómica inserta Partido, slots 1/2 y transición inicial;
- Organizador edita todo; Capitán solo su equipo; member y ex-capitán no;
- cambiar costo/participantes conserva fijos y pagados, recalcula automáticos con residuo por `joinedOrder`;
- quitar participante borra su única Actuación/Aporte y recalcula;
- cierre inválido hace rollback completo;
- deuda pendiente no bloquea cierre;
- cerrado congela deporte/esperado pero permite `paidMinor` a autoridad válida;
- reapertura retira estadísticas;
- `lockVersion` obsoleto devuelve conflicto;
- dos cierres concurrentes producen uno exitoso y uno conflictivo, nunca dos transiciones.

Run:

```bash
bun test packages/db/src/matches/commands.integration.test.ts
```

Expected: FAIL porque los comandos no están exportados.

- [ ] **Step 2: Implementar alcance y comandos**

Cada comando:

1. abre transacción;
2. valida miembro/autoridad usando identidad server-side;
3. `SET LOCAL app.group_id = $1`;
4. bloquea raíz con `FOR UPDATE`;
5. compara `lockVersion`;
6. usa `calculateExpectedContributions` y `validateMatchClosure` existentes;
7. actualiza hijos y auditoría;
8. incrementa `lockVersion`;
9. devuelve un DTO completo con bigint decimal.

No copiar las fórmulas de `rules.ts` al router o UI.

Run:

```bash
bun test packages/db/src/matches/commands.integration.test.ts
bun test packages/db/src/matches/rules.test.ts
```

Expected: PASS y las 17 pruebas/53 assertions de `#18` siguen verdes.

- [ ] **Step 3: Exponer tRPC por intención**

Inputs Zod deben incluir `matchId` y `lockVersion`, pero no tomar `groupId` como evidencia de acceso. Mapear errores:

```ts
const errorMap = {
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  stale_version: "CONFLICT",
  invalid_transition: "PRECONDITION_FAILED",
  invalid_match: "BAD_REQUEST",
} as const;
```

Run:

```bash
bun test packages/api/src/routers/matches.integration.test.ts
```

Expected: matriz organizador/capitán/member y equipo rival PASS.

- [ ] **Step 4: Commit boundary B**

```bash
git add packages/db/src/matches.ts packages/db/src/matches packages/api/src/routers/matches.ts packages/api/src/routers/index.ts
git commit -m "feat: add transactional match commands"
```

Expected: un commit; sin páginas ni estilos.

### Task 3: Dashboard compartido y estadísticas reales

**Depends on:** Tasks 1 y 2.

**Files:** `packages/db/src/stats*`, router stats/shared y UI `/compartido`.

- [ ] **Step 1: Escribir la tabla de verdad estadística**

Sembrar tres Partidos: cerrado, abierto y cerrado luego reabierto. Incluir 0–0, gol sin autor, autogol, dos jugadores homónimos, jugador archivado y uno con cero PJ.

Assert:

```ts
expect(summary.matchesPlayed).toBe(1);
expect(ranking.map((row) => row.playerId)).toEqual([expectedStableWinner]);
expect(zeroAppearancePlayer).not.toBeIn(ranking);
expect(reopenedMatchContribution).toBeUndefined();
```

Cubrir PJ/PG/PE/PP, 3-1-0, win%, G/A/G+A, tasas por PJ, GF/GC/DG, autogoles, filtros inclusivos por fecha local y Cancha, y todos los desempates.

Run:

```bash
bun test packages/db/src/stats/queries.integration.test.ts
```

Expected: FAIL porque no existe `@hay-fulbo/db/stats`.

- [ ] **Step 2: Implementar CTEs acotados**

Implementar `closed_matches → team_scores → appearance_results → group/player aggregates`. Convertir fechas del Grupo a intervalo UTC semiabierto. Las queries reciben un scope ya autorizado y no interpolan identificadores.

Run:

```bash
bun test packages/db/src/stats/queries.integration.test.ts
```

Expected: PASS, incluido reabrir y volver a cerrar sin duplicar.

- [ ] **Step 3: Escribir tests de la Vista compartida**

Probar `/compartido#secreto` → POST intercambio → URL limpia → dashboard, y verificar:

- próximo Partido abierto y Partidos cerrados visibles;
- cancelados aparecen solo en historial con etiqueta, no en estadísticas/deuda;
- total/esperado/pagado/deuda y estado por persona correctos;
- filtros se conservan en query string;
- detalle del Partido no ofrece botones ni endpoints de mutación;
- headers `private, no-store`, `no-referrer`, `noindex`.

Run:

```bash
bun run test:e2e -- --project=mobile tests/e2e/shared-dashboard.spec.ts
```

Expected: FAIL con ruta ausente.

- [ ] **Step 4: Reimplementar “El vestuario”**

Orden de una sola columna móvil:

1. Grupo + “Enlace privado · solo lectura”.
2. Próximo partido.
3. Caja y deudores.
4. Filtros compactos.
5. Ranking.
6. Historial y detalle.

En escritorio usar máximo 1120 px y dos columnas solo para próximo partido/caja; rankings pueden usar tabla responsive con encabezado fijo, sin convertir cada métrica en una card. Estados vacíos explican que solo cerrados cuentan.

Run:

```bash
bun run test:e2e -- --project=mobile tests/e2e/shared-dashboard.spec.ts
bun run test:e2e -- --project=desktop tests/e2e/shared-dashboard.spec.ts
```

Expected: PASS en 390×844 y 1280×800, sin overflow horizontal.

- [ ] **Step 5: Commit boundary C**

```bash
git add packages/db/src/stats.ts packages/db/src/stats packages/api/src/routers/stats.ts packages/api/src/routers/shared.ts apps/web/src/app/compartido apps/web/src/features/shared apps/web/src/proxy.ts apps/web/src/app/robots.ts tests/e2e/shared-dashboard.spec.ts
git commit -m "feat: publish shared group dashboard"
```

Expected: dashboard navegable por capacidad real, sin datos mock.

### Task 4: Shell oscuro y flujos móviles de operación

**Depends on:** Tasks 1 y 2. Puede consumir los queries de Task 3 cuando estén integrados.

**Files:** todos los archivos de “UI real” salvo `/compartido`, `proxy.ts` y `robots.ts`.

- [ ] **Step 1: Fijar tema oscuro y shell con una prueba visual/semántica**

Crear un test Playwright que compruebe:

```ts
await expect(page.locator("html")).toHaveClass(/dark/);
await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
await expect(page.locator("body")).toHaveCSS("background-color", "rgb(16, 21, 18)");
```

También validar foco visible, target 44×44 y ausencia del toggle de tema.

Run:

```bash
bun run test:e2e -- --project=mobile tests/e2e/shell.spec.ts
```

Expected: FAIL con el scaffold actual.

- [ ] **Step 2: Aplicar `DESIGN.md` literalmente a tokens, no a layouts prototipo**

Usar Manrope y colores `pitch-black`, `locker-room`, `lifted-surface`, `quiet-border`, `chalk`, `muted-chalk`, `pitch-lime`, `danger`, `success`, `team-blue`, `team-amber`. Fijar `lang="es"`, metadata “Hay Fulbo” y un único CTA primario visible.

Run:

```bash
bun run test:e2e -- --project=mobile tests/e2e/shell.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Implementar alta operativa mínima**

Recorrido E2E:

1. iniciar sesión;
2. crear Grupo ARS/Buenos Aires;
3. crear tres Jugadores, uno sin cuenta;
4. crear Cancha guardada;
5. invitar a un member;
6. crear enlace compartido.

Run:

```bash
bun run test:e2e -- --project=mobile tests/e2e/group-setup.spec.ts
```

Expected: FAIL antes de UI, luego PASS sin recarga manual.

- [ ] **Step 4: Reimplementar “Mesa de control”**

Crear Partido en una vista breve (fecha, Cancha, costo); luego detalle con marcador/estado persistente y tabs directas:

- Datos: fecha, Cancha, costo, nombres/colores.
- Equipos: selección rápida y alta inline de Jugador; capitanes opcionales.
- Caja: esperado, pagado, estado, deuda; ajuste fijo solo Organizador.
- Juego: botones ± para G/A/autogol y goles sin autor; mínimo cero.
- Cierre: checklist derivado; deuda advierte y no bloquea.

No mostrar todos los campos juntos. CTA fijo contextual en móvil. Cerrar/cancelar/quitar participante requieren confirmación con consecuencia explícita.

Run:

```bash
bun run test:e2e -- --project=mobile tests/e2e/match-lifecycle.spec.ts
```

Expected: crear abierto → armar → cargar → cerrar → pagar tarde → reabrir → corregir → cerrar PASS.

- [ ] **Step 5: Verificar capitanía desde una segunda sesión**

El E2E usa dos contextos:

- Capitán A modifica solo su equipo y pago después del cierre.
- Capitán A recibe 403 al tocar rival, detalles generales o cierre.
- Reasignación revoca inmediatamente la sesión anterior.
- Organizador ve y corrige todo.

Run:

```bash
bun run test:e2e -- --project=desktop tests/e2e/captain-authority.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit boundary D**

```bash
git add packages/ui/src/styles/globals.css apps/web/src/app apps/web/src/components apps/web/src/features/matches tests/e2e/group-setup.spec.ts tests/e2e/match-lifecycle.spec.ts tests/e2e/captain-authority.spec.ts
git commit -m "feat: build dark mobile match flows"
```

Expected: UI real completa; no archivos de prototipo.

### Task 5: Hardening funcional, seguridad, accesibilidad y responsive

**Depends on:** Tasks 1–4 y 6.

**Files:** test harness, tests E2E, headers, manifest y ajustes puntuales encontrados.

- [ ] **Step 1: Convertir la matriz de aceptación en tests**

Agregar specs para auth, Grupo, lifecycle, shared, a11y, security y PWA. No crear snapshots gigantes; probar roles, nombres accesibles, estados y efectos observables.

Run:

```bash
bun run test:unit
bun run test:integration
bun run test:e2e
```

Expected: la primera ejecución descubre cualquier criterio incumplido; corregir uno por vez sin ampliar alcance.

- [ ] **Step 2: Seguridad negativa**

Automatizar:

- IDs de otro Grupo en query/mutation siempre 403/404 sin filtración;
- SQL role runtime no puede leer sin `app.group_id` ni saltar RLS;
- token viejo/cookie vieja mueren tras rotar/revocar;
- CSRF/origin inválido rechazado en auth y exchange;
- rate limiting en registro, login, recuperación, invitación e intercambio;
- secretos ausentes de logs, HTML, JSON, build layers y repo;
- shared responde a métodos mutantes con 405 o no tiene ruta;
- CSP, HSTS, `nosniff`, frame-ancestors y permisos mínimos en producción.

Run:

```bash
bun test packages/api --grep security
bun run test:e2e -- tests/e2e/security.spec.ts
```

Expected: PASS.

- [ ] **Step 3: WCAG 2.2 AA y responsive**

Ejecutar axe en login, selector de Grupo, Mesa de control (cada tab), cierre, dashboard compartido, ranking vacío y error. Probar solo teclado, zoom 200%, reduced motion y mensajes no dependientes de color.

Run:

```bash
bun run test:e2e -- tests/e2e/accessibility.spec.ts
```

Expected: cero violaciones `serious`/`critical`, foco nunca oculto y cero overflow a 390 px.

- [ ] **Step 4: Batería de release local**

```bash
bun run check
git diff --exit-code
bun run check-types
bun run test:unit
bun run test:integration
bun run test:e2e
bun run build
docker build -f apps/web/Dockerfile -t hay-fulbo:acceptance .
```

Expected: todos exit 0. `bun run check` puede formatear; el segundo comando exige que el agente haya agregado/commiteado ese formato antes de continuar.

- [ ] **Step 5: Commit boundary E**

```bash
git add package.json bun.lock playwright.config.ts tests apps/web packages
git commit -m "test: harden mvp acceptance"
```

Expected: únicamente hardening y correcciones derivadas, sin features nuevas.

### Task 6: Imagen productiva, migraciones y health

**Depends on:** núcleo `#18`; puede correr en paralelo con Tasks 1–4.

**Files:** todos los archivos de “Producción” salvo `ops/coolify/*` y release evidence.

- [ ] **Step 1: Escribir smoke de imagen fallido**

Testear que una DB vacía arranca, migra y responde:

```bash
docker compose -f docker-compose.test.yml up -d --wait postgres
docker build -f apps/web/Dockerfile -t hay-fulbo:test .
docker run --rm --network hay-fulbo-test \
  -e DATABASE_URL=...runtime... \
  -e DATABASE_MIGRATION_URL=...migration... \
  -e BETTER_AUTH_SECRET=... \
  -e BETTER_AUTH_URL=http://127.0.0.1:3001 \
  -e CORS_ORIGIN=http://127.0.0.1:3001 \
  hay-fulbo:test
```

Expected: FAIL inicialmente porque no hay runner ni health real.

- [ ] **Step 2: Implementar migración pre-start segura**

`migrate.ts` usa solo `DATABASE_MIGRATION_URL`. `docker-entrypoint.sh` ejecuta migración, luego `unset DATABASE_MIGRATION_URL` y `exec node apps/web/server.js`. Nunca usa `db:push` ni down migration.

Run:

```bash
bun packages/db/src/migrate.ts
bun packages/db/src/migrate.ts
```

Expected: ambas ejecuciones exit 0; la segunda no cambia esquema ni journal.

- [ ] **Step 3: Corregir Dockerfile y Compose**

- copiar Bun desde `oven/bun:1.3.3`;
- `bun install --frozen-lockfile`;
- incluir SQL/journal/runner;
- `HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=60s`;
- `/api/health` ejecuta `select 1`, 200/503 y `Cache-Control: no-store`;
- Compose 2.13 usa `env_file` corto o solo `environment`;
- PostgreSQL de desarrollo puede enlazar `127.0.0.1`, nunca `0.0.0.0`.

Run:

```bash
docker compose config
docker build -f apps/web/Dockerfile -t hay-fulbo:test .
```

Expected: PASS con Compose 2.13+ y Docker.

- [ ] **Step 4: Probar rol runtime real**

Crear rol migrator owner y runtime `NOSUPERUSER NOBYPASSRLS`; conceder DML/tablas/secuencias y `EXECUTE` solo sobre `hay_fulbo_resolve_shared_group`. Confirmar:

```sql
select * from match; -- 0 rows/error sin app.group_id, nunca datos cruzados
set local app.group_id = 'group-a';
select * from match; -- solo group-a
```

Run:

```bash
bun test packages/db/src/matches/runtime-role.integration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit boundary F**

```bash
git add packages/db/src/migrate.ts packages/db/src/matches/runtime-role.integration.test.ts apps/web/Dockerfile apps/web/docker-entrypoint.sh apps/web/src/app/api/health/route.ts docker-compose.yml
git commit -m "ops: prepare production container"
```

Expected: imagen standalone healthy, migrable e idempotente.

### Task 7: Provisionar y lanzar en Coolify

**Depends on:** Tasks 5 y 6 integradas en `main`.

**Files:** `ops/coolify/*` y `docs/releases/production.md`.

- [ ] **Step 1: Escribir reconciliador dry-run**

`reconcile.mjs --dry-run` descubre por nombre/UUID y produce solo acciones redactadas. Lee secretos desde variables o la ubicación segura ya documentada por `#14`; nunca imprime valores. Debe ser idempotente.

Run:

```bash
node ops/coolify/reconcile.mjs --dry-run
```

Expected: lista proyecto/ambiente/app/DB/backup a crear o actualizar, sin token, password, URL con credenciales o S3 secret.

- [ ] **Step 2: Reconciliar recursos**

Crear/reusar:

- proyecto `hay-fulbo`, ambiente `production`;
- PostgreSQL `hay-fulbo-postgres`, privado, persistente;
- roles separados `migration` y `runtime`;
- app `hay-fulbo-web`, repo público, `main`, Dockerfile, puerto 3001;
- FQDN autogenerado si no hay uno;
- variables runtime: `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `NODE_ENV`, `SMTP_URL`, `AUTH_EMAIL_FROM`;
- auto deploy deshabilitado y health checks habilitados.

Run:

```bash
node ops/coolify/reconcile.mjs --apply
node ops/coolify/reconcile.mjs --dry-run
```

Expected: primera ejecución completa; segunda dice “sin cambios”.

- [ ] **Step 3: Configurar y verificar backups**

Backups diarios: 7 locales y 30 S3-compatible. Si no existe storage S3 utilizable, esta es la única precondición externa que se reporta; no sustituirlo por un bucket inventado.

Forzar backup, restaurar en DB temporal, comprobar journal/tablas, y eliminar solo la DB temporal.

Run:

```bash
node ops/coolify/reconcile.mjs --verify-backup-restore
```

Expected: backup `completed`, restore abre, tabla de migraciones y esquema esperado presentes, DB temporal retirada.

- [ ] **Step 4: Fijar y desplegar exactamente `origin/main`**

```bash
git fetch origin main
test "$(git rev-parse main)" = "$(git rev-parse origin/main)"
node ops/coolify/deploy.mjs --sha "$(git rev-parse origin/main)"
```

Expected: un único `deployment_uuid`, terminal success/healthy y commit desplegado igual al SHA.

- [ ] **Step 5: Smoke externo y rollback automático**

```bash
node ops/coolify/smoke.mjs --expected-sha "$(git rev-parse origin/main)"
```

Expected:

- `/api/health` 200 tres veces;
- `/` HTTPS sin downgrade;
- `/api/auth/get-session` respuesta anónima válida;
- migración aplicada y segunda corrida no-op;
- login/crear Grupo/Partido/cerrar/Vista compartida smoke PASS;
- headers shared seguros.

Ante fallo, `deploy.mjs` vuelve al último SHA healthy y repite smoke; nunca restaura DB por fallo de aplicación.

- [ ] **Step 6: Registrar evidencia sin secretos**

Completar `docs/releases/production.md` con fecha, FQDN, SHA, deployment UUID, migración, builds, health, smoke, backup UUID/fecha, restore y SHA anterior healthy.

- [ ] **Step 7: Commit boundary G**

```bash
git add ops/coolify docs/releases/production.md
git commit -m "ops: automate coolify release"
git push origin main
```

Expected: automatización reproducible y evidencia final en `main`; el deploy ya corresponde al SHA de producción o se ejecuta una última vez para este commit documental si el documento altera el SHA.

## Matriz de aceptación

| Área | Criterio verificable | Evidencia automática/operativa | Task |
| --- | --- | --- | --- |
| Funcional | Usuario verificado crea Grupo y queda owner; puede alternar varios Grupos | integration + `group-setup.spec.ts` | 1, 4 |
| Funcional | Jugador existe sin Usuario; vínculo 1:1 por Grupo no mueve historial ni concede permisos | integration | 1 |
| Funcional | Jugadores/Canchas se crean y archivan; historia permanece; archivados no aparecen para nuevos Partidos | integration + E2E | 1, 4 |
| Funcional | Partido nace abierto con dos equipos temporales; capitanes son opcionales | commands integration | 2 |
| Funcional | Organizador edita todo; Capitán solo plantel/actuación/pago de su equipo | API integration + dos sesiones E2E | 2, 4 |
| Funcional | Costo se prorratea exactamente en minor units, conserva fijos/pagados y asigna residuo por ingreso | rules + commands integration | 2 |
| Funcional | Estados exento/pendiente/parcial/pagado/excedido y deuda/excedente son derivados | commands/shared tests | 2, 3 |
| Funcional | Marcador = atribuidos + sin autor + autogoles rivales; asistencias no exceden goles asistibles | rules + lifecycle E2E | 2, 4 |
| Funcional | Solo Organizador cierra; cierre atómico valida fecha, Cancha, costo, equipos, actuaciones y esperado | commands integration | 2 |
| Funcional | Deuda no bloquea cierre; pago tardío permitido; otras correcciones requieren reapertura | integration + lifecycle E2E | 2, 4 |
| Funcional | Cancelar/restaurar/reabrir exige razón cuando corresponde y audita actor/instante | commands integration | 2 |
| Funcional | Solo cerrados cuentan; reabrir retira y recerrar incorpora una vez | stats integration | 3 |
| Funcional | Resumen y rankings incluyen todas las métricas/desempates acordados y filtros | stats integration + shared E2E | 3 |
| Funcional | Visitante con enlace ve toda la información funcional, nunca controles de escritura | shared E2E | 3 |
| Seguridad | No miembro, Grupo cruzado, ID adivinado y autoridad revocada no leen/escriben | negative integration/E2E | 1, 2, 5 |
| Seguridad | RLS runtime `FORCE`, rol sin BYPASS/owner y `SET LOCAL` por transacción | DB integration | 5, 6 |
| Seguridad | Secreto shared 256 bits, hash-only, cookie HttpOnly/Secure/Lax, rotación inmediata | shared integration | 1, 5 |
| Seguridad | Shared no expone email, membresía, invitación, auditoría, hashes ni tokens | contract tests | 1, 5 |
| Seguridad | Auth, invitación, recuperación e intercambio tienen rate limit y validación origin/CSRF | security tests | 1, 5 |
| Seguridad | No hay secretos en repo, logs, HTML, JSON, args o layers | secret scan + image inspect | 5, 6, 7 |
| A11y | WCAG 2.2 AA, contraste dark, foco visible, teclado, labels, mensajes no solo color | axe + keyboard E2E | 4, 5 |
| A11y | Targets táctiles ≥44 px y reduced motion respetado | Playwright geometry/media | 4, 5 |
| Responsive | Flujos completos sin overflow a 390×844; escritorio 1280×800 amplía sin reordenar el modelo mental | mobile/desktop projects | 3, 4, 5 |
| Diseño | Dark default, simple/moderno, una acción lime dominante, densidad reducida y sin anti-references | shell assertions + visual inspection automatizada por screenshots | 4, 5 |
| PWA | Manifest apunta a ruta existente, colores dark, iconos válidos e instalación standalone | manifest test | 5 |
| Ops | Build, tipos, tests, Next build y Docker build pasan desde checkout limpio | release battery | 5, 6 |
| Ops | Migración versionada corre dos veces; runtime inicia solo si migra | container smoke | 6 |
| Ops | `/api/health` verifica DB, 200/503, no-store; Docker/Coolify health gate | integration + external smoke | 6, 7 |
| Ops | PostgreSQL privado, persistente, backup 7 local/30 S3 y restore probado | Coolify reconciliation/evidence | 7 |
| Ops | Deploy único fija SHA de `origin/main`, conserva tres releases y rollback vuelve al healthy | deploy script/evidence | 7 |

## Batería final y definición de terminado

En un checkout limpio de `origin/main`:

```bash
bun install --frozen-lockfile
bun run check-types
bun run test:unit
docker compose -f docker-compose.test.yml up -d --wait
bun run test:integration
bun run test:e2e
bun run build
docker build -f apps/web/Dockerfile -t hay-fulbo:release .
git diff --exit-code
```

Expected: todo exit 0, ningún archivo generado sin trackear y ninguna prueba skipped. Luego Coolify debe desplegar exactamente ese SHA, pasar health/smoke, completar backup+restore y registrar evidencia.

El MVP está terminado únicamente cuando:

1. todos los criterios de la matriz pasan;
2. `main` y `origin/main` coinciden;
3. Coolify sirve el SHA esperado por HTTPS;
4. el enlace compartido funciona sin login y no escribe;
5. hay un backup restaurado y verificado;
6. el documento de release contiene evidencia y cero secretos.

## Tickets ejecutables a crear

1. **Implementar acceso seguro y gestión de grupos** — Task 1. Depende de `Implementar el núcleo de dominio y persistencia`.
2. **Implementar comandos transaccionales y permisos de partidos** — Task 2. Depende de `Implementar acceso seguro y gestión de grupos`.
3. **Publicar dashboard compartido y estadísticas reales** — Task 3. Depende de `Implementar comandos transaccionales y permisos de partidos`.
4. **Construir shell oscuro y flujos móviles de operación** — Task 4. Depende de `Implementar acceso seguro y gestión de grupos` y `Implementar comandos transaccionales y permisos de partidos`.
5. **Preparar imagen productiva, migraciones y health checks** — Task 6. Depende de `Implementar el núcleo de dominio y persistencia`.
6. **Endurecer seguridad, accesibilidad y recorridos E2E** — Task 5. Depende de los cuatro tickets de producto anteriores y `Preparar imagen productiva, migraciones y health checks`.
7. **Provisionar y lanzar Hay Fulbo en Coolify** — Task 7. Depende de `Endurecer seguridad, accesibilidad y recorridos E2E` y `Preparar imagen productiva, migraciones y health checks`.
