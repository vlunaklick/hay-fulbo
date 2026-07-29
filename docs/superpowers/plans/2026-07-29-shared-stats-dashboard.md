# Shared Stats Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use TDD to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish real, group-isolated football statistics for signed-in members and the private, read-only shared view.

**Architecture:** A stats module in `@hay-fulbo/db` owns authorization, filtering, score derivation, aggregates, and read DTOs. Authenticated and shared tRPC routers expose the same read model through different capability checks, while feature-local React routes render “El vestuario” without changing the application shell or global theme.

**Tech Stack:** Bun, TypeScript, Drizzle/PostgreSQL, tRPC, Next.js App Router, TanStack Query, shadcn/base-lyra, Tailwind CSS.

---

### Task 1: Statistical domain rules

**Files:**

- Create: `packages/db/src/stats/types.ts`
- Create: `packages/db/src/stats/derive.ts`
- Test: `packages/db/src/stats/derive.test.ts`
- Create: `packages/db/src/stats.ts`
- Modify: `packages/db/package.json`

- [ ] **Step 1: Write a failing test for closed-only aggregates**

Cover a closed match, an open match, a reopened match, unattributed goals, an own goal, a draw, a win/loss, an archived player, stable homonyms, and a player with no appearance. Assert PJ/PG/PE/PP, 3-1-0 points, win percentage, G/A/G+A, per-match rates, GF/GC/DG, own goals, summary totals, and deterministic ranking.

- [ ] **Step 2: Run the test and verify the public stats module is missing**

Run: `bun test packages/db/src/stats/derive.test.ts`

Expected: FAIL because `@hay-fulbo/db/stats` is not implemented.

- [ ] **Step 3: Implement the minimal pure derivation**

Calculate scores from attributed goals, unattributed goals, and opposing own goals. Count only `closed` matches and only players with appearances. Keep own goals separate from goals and G+A.

- [ ] **Step 4: Add filter and player-detail tests**

Cover `all`, local inclusive date intervals, court filtering, result filtering for history, and one player’s match-by-match record.

- [ ] **Step 5: Run the focused tests**

Run: `bun test packages/db/src/stats/derive.test.ts`

Expected: PASS.

### Task 2: Authorized PostgreSQL read model

**Files:**

- Create: `packages/db/src/stats/queries.ts`
- Test: `packages/db/src/stats/queries.integration.test.ts`
- Modify: `packages/db/src/stats.ts`

- [ ] **Step 1: Write failing integration tests**

Seed two organizations. Assert a member can read only their active group; a non-member is forbidden; a valid shared hash/generation is read-only; a rotated, revoked, or foreign shared capability is forbidden; open/reopened matches never affect aggregates.

- [ ] **Step 2: Implement `createStatsQueries`**

Expose `dashboard(access, filters)`, `player(access, playerId, filters)`, and `match(access, matchId)`. Resolve member or shared access inside the same transaction, set `app.group_id`, fetch normalized rows, then call the pure derivation.

- [ ] **Step 3: Run the database tests**

Run: `bun test packages/db/src/stats/queries.integration.test.ts`

Expected: PASS when `TEST_DATABASE_URL` is available; otherwise explicit skip with unit derivation still green.

### Task 3: Authenticated and shared read-only APIs

**Files:**

- Create: `packages/api/src/routers/stats.ts`
- Modify: `packages/api/src/routers/index.ts`
- Modify: `packages/api/src/routers/shared.ts`
- Modify: `packages/api/src/access-runtime.ts`
- Modify: `packages/api/src/shared-access.ts`
- Test: `packages/api/src/shared-access.test.ts`
- Test: `packages/api/src/routers/stats.test.ts`

- [ ] **Step 1: Write failing permission/shape tests**

Assert member and shared endpoints return the same DTO, shared requests require the exchanged cookie capability, and the shared router exposes queries only.

- [ ] **Step 2: Add Zod inputs and error mapping**

Accept period, court, result, player ID, and match ID without accepting a caller-provided group ID as authorization evidence.

- [ ] **Step 3: Wire the database read model**

Use the session’s active organization for member reads and the validated token hash/generation held by shared access for capability reads.

- [ ] **Step 4: Run API tests**

Run: `bun test packages/api`

Expected: PASS.

### Task 4: “El vestuario” web experience

**Files:**

- Create: `apps/web/src/features/stats/stats-client.ts`
- Create: `apps/web/src/features/stats/stats-dashboard.tsx`
- Create: `apps/web/src/features/stats/stats-loading.tsx`
- Create: `apps/web/src/features/stats/stats-error.tsx`
- Create: `apps/web/src/features/stats/player-stats.tsx`
- Create: `apps/web/src/features/stats/match-detail.tsx`
- Create: `apps/web/src/features/stats/shared-fragment.ts`
- Create: `apps/web/src/app/compartido/page.tsx`
- Create: `apps/web/src/app/compartido/jugadores/[playerId]/page.tsx`
- Create: `apps/web/src/app/compartido/partidos/[matchId]/page.tsx`
- Create: `apps/web/src/app/estadisticas/page.tsx`
- Create: `apps/web/src/app/estadisticas/jugadores/[playerId]/page.tsx`
- Create: `apps/web/src/app/estadisticas/partidos/[matchId]/page.tsx`
- Modify only as needed: `packages/ui/src/components/*`

- [ ] **Step 1: Inspect shadcn base-lyra info and official component docs**

Run the shadcn CLI from `packages/ui`, then add only missing primitives needed for alert, badge, select, separator, skeleton, and table.

- [ ] **Step 2: Implement the shared capability bootstrap without direct `useEffect`**

Exchange a URL-fragment secret once through `/api/shared/exchange`, clear the fragment with `history.replaceState`, and then enable the shared query. Keep external synchronization inside a dedicated custom hook.

- [ ] **Step 3: Render the mobile-first dashboard**

Order: group/privacy, next match, finances/debtors, compact filters, ranking, history. Use semantic tokens, one prominent lime action at most, 44px controls, a 1120px desktop cap, and two columns only for next match/finances.

- [ ] **Step 4: Render player and closed-match details**

Rows link to read-only details. Never render mutation controls in `/compartido`.

- [ ] **Step 5: Add loading, error, and contextual empty states**

Explain that only closed matches count and preserve filter values in the query string.

### Task 5: Verification and publication

**Files:**

- Test: focused unit/integration tests above
- Modify: only defects found by validation

- [ ] **Step 1: Run formatting, tests, types, and build**

Run:

```bash
bun run check
bun run check-types
bun test packages/db/src/stats packages/api
bun run build
```

Expected: all exit 0 and formatting changes are included.

- [ ] **Step 2: Validate real UI states**

Seed a disposable real database, exchange a real shared link, and inspect empty/loading/error/populated states at mobile, tablet, and desktop widths. Verify keyboard focus, no horizontal overflow, and AA contrast.

- [ ] **Step 3: Commit and publish the branch**

Run:

```bash
git add packages/db packages/api apps/web packages/ui docs/superpowers/plans/2026-07-29-shared-stats-dashboard.md
git commit -m "feat: publish shared stats dashboard"
git push -u origin feat/stats-dashboard
gh issue comment 21 --body "Implemented and verified on feat/stats-dashboard."
```

Expected: branch is pushed and issue #21 contains the implementation evidence; do not merge or close it.
