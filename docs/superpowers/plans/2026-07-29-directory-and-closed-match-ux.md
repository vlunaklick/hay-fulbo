# Directory and Closed Match UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the theme crash and replace technical, scroll-heavy management screens with a useful home dashboard plus compact shadcn interfaces for groups, players, courts, and closed matches.

**Architecture:** Keep the existing command API and immutable closed-match model. Reuse `upsertPlayer` (including its account-link validation), `upsertCourt`, archive commands, and the stats dashboard query. Change only the read model needed for player cards, then compose focused client components with shadcn Dialog, Card, Select, Field, Badge, and Button.

**Tech Stack:** Next.js App Router, React 19, tRPC, TanStack Query, Base UI-backed shadcn/ui, Drizzle/PostgreSQL, Playwright, Bun.

**Execution ownership:** One agent owns Tasks 2 and 3 and is the only writer of `directory-page.tsx`. One agent owns Task 4. One agent owns Tasks 1 and 5 but does not edit `app-shell.tsx`. The primary agent owns Tasks 6 and 7 and is the only writer of `app-shell.tsx`. Per user direction, do not add an E2E spec per feature; keep the existing happy path and theme regression only.

---

### Task 1: Fix and compact the theme selector

**Files:**
- Modify: `apps/web/src/components/mode-toggle.tsx`

- [ ] Keep the existing shared red theme scenario. It opens `Tema`, asserts the URL is unchanged, chooses `Claro`, and asserts the persistent `Principal` navigation landmark remains visible.
- [ ] Run it before implementation and record the Base UI `MenuGroupContext is missing` failure.
- [ ] Wrap `DropdownMenuLabel` and `DropdownMenuRadioGroup` in `DropdownMenuGroup`, matching the Base UI shadcn composition contract.
- [ ] Make the trigger icon-only on small screens and keep the visible `Tema` label from `sm` upward, with an accessible name.
- [ ] Re-run the focused desktop and mobile Playwright tests; expect the selector to open without a console exception or navigation.
- [ ] Commit as `fix: stabilize theme selector`.

### Task 2: Replace the player table with cards and a detail/editor dialog

**Files:**
- Modify: `apps/web/src/components/directory-page.tsx`
- Modify: `apps/web/src/lib/player-account-link.ts`
- Test: `apps/web/src/lib/player-account-link.test.ts`

- [ ] Add failing tests asserting the visible account label is always a human name/email or `Sin cuenta vinculada`, never `__unlinked__` or a raw user ID.
- [ ] Run the focused unit test and confirm it fails before implementing the presentation-label helper.
- [ ] Query `trpc.stats.dashboard` alongside the directory and map each aggregate by `playerId`.
- [ ] Render players in a responsive card grid with name, active/archived state, and compact totals for matches, goals, and assists.
- [ ] Open a shadcn `Dialog` when a player card is activated. Show matches, goals, assists, G+A, wins, draws, losses, and win percentage, with empty zero stats when the player has no closed appearances.
- [ ] For Organizers, add an edit mode in the dialog using `FieldGroup`, `Field`, `Input`, and the account `Select`. Give the Base UI `Select` its complete `items` collection, use `null` for the unlink option, and render a controlled human presentation label in `SelectValue`. Submit `upsertPlayer` with `playerId`, edited name, and the selected account. Keep archive/reactivate as a separate explicit action.
- [ ] For members, keep the dialog read-only.
- [ ] Use a controlled `SelectValue` with a presentation-only label; IDs remain only in option values and mutation payloads.
- [ ] Invalidate directory and stats queries after every successful mutation.
- [ ] Run unit, type, and E2E tests; expect no horizontal table scroll and no technical identifiers in rendered text.
- [ ] Commit as `feat: simplify player directory`.

### Task 3: Add court editing without exposing imported placeholders as immutable data

**Files:**
- Modify: `apps/web/src/components/directory-page.tsx`

- [ ] Reuse each court row/card as a button that opens a shadcn `Dialog`.
- [ ] Show name, address, Maps action, and active/archived state.
- [ ] For Organizers, prefill fields and submit `upsertCourt` with `courtId`, name, address, and an HTTP(S) Maps URL.
- [ ] Keep archive/reactivate as a separate explicit action; never delete historical court references.
- [ ] Run focused E2E tests for editing the imported placeholder court into real data.
- [ ] Commit as `feat: add court editing`.

### Task 4: Compact the closed-match game view

**Files:**
- Modify: `apps/web/src/app/dashboard/partidos/[matchId]/page.tsx`

- [ ] Preserve the existing editable form only for an open match where the Organizer or team Captain can edit.
- [ ] For closed/cancelled matches, render two compact team panels side by side on desktop. Each player row shows name and concise `G`, `A`, and `AG` totals.
- [ ] While touching the match-detail selects, provide each Base UI Select root its complete `items` collection and a human presentation label.
- [ ] Render unattributed goals as a compact summary row only when non-zero.
- [ ] Preserve the explicit `Reabrir partido` action and reason dialog as the only path back to editing.
- [ ] Keep the Caja tab and post-close aporte updates unchanged; only sporting fields become compact read-only rows.
- [ ] Verify desktop fits the ten-player sports view without the previous long form scroll; verify mobile stacks cleanly.
- [ ] Commit as `feat: compact closed match results`.

### Task 5: Polish shared selector geometry

**Files:**
- Modify: `packages/ui/src/components/select.tsx`
- Modify: `packages/ui/src/components/dropdown-menu.tsx`
- Modify: `apps/web/src/features/stats/stats-dashboard.tsx`
- Modify: `apps/web/src/app/dashboard/partidos/nuevo/page.tsx`

- [ ] Use one visual vocabulary: rounded trigger, rounded popup, padded menu surface, and lightly rounded items while retaining 44px touch targets.
- [ ] In the files owned by this task, ensure every `SelectItem` is inside `SelectGroup`, every form select is inside `Field`, every Base UI Select root receives its full `items` collection, nullable placeholders use `value: null`, and controlled triggers use human presentation labels. Directory, match-detail, and app-shell selects are handled in their owning tasks.
- [ ] Re-run the focused contract and component tests.
- [ ] Commit as `style: unify directory controls` before the release commit sequence.

### Task 6: Add a useful dashboard home

**Files:**
- Create: `apps/web/src/app/dashboard/partidos/page.tsx`
- Create: `apps/web/src/components/home-dashboard.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`

- [ ] Move the current match list UI from `/dashboard` to `/dashboard/partidos` without changing its behavior.
- [ ] Make `/dashboard` query `trpc.stats.dashboard` and render a concise overview: played matches, total goals, goals per match, top scorers/G+A, latest results, next match, and current payment state.
- [ ] While touching app-shell selects, provide each Base UI Select root its complete `items` collection and a human presentation label.
- [ ] Keep one dominant action, `Nuevo partido`, and compact links to the full match/statistics views.
- [ ] Add `Inicio` and `Partidos` as distinct navigation destinations, with four compact mobile nav items.
- [ ] Cover empty, loading, error, upcoming, and no-upcoming states using shadcn components.
- [ ] Run desktop/mobile E2E and verify the imported totals are visible without exposing record IDs.
- [ ] Commit as `feat: add group dashboard`.

### Task 7: Turn the group title into a group switcher and creator

**Files:**
- Modify: `apps/web/src/components/app-shell.tsx`
- Create: `apps/web/src/components/group-switcher.tsx`

- [ ] Replace the static header group name with an accessible shadcn Dropdown Menu trigger.
- [ ] Show each available group by human name and indicate the active group; never render organization IDs.
- [ ] Selecting another group calls the existing `group.select` mutation, clears scoped query cache, and refreshes the route.
- [ ] Add a separated `Crear grupo` action that opens the existing short creation form in a shadcn Dialog.
- [ ] Extract the creation form so the no-group gate and the switcher share the same validation and mutation behavior.
- [ ] Keep the control compact on mobile and align it to the dashboard content axis.
- [ ] Run E2E for switch/create and commit as `feat: add group switcher`.

### Task 8: Full verification and production release

**Files:**
- Verify only: reusable importer files remain committed and unchanged.
- Remove if present: local untracked `.tmp-production-history-import.mjs`.

- [ ] Run `bun run check`, unit/integration tests, the existing happy-path/theme E2E only, and a production Docker build.
- [ ] Confirm the one-off import task and `HAY_FULBO_HISTORY_IMPORT_JSON` environment variable are absent from Coolify. Keep the generic, payload-free import CLI and ledger for future safe imports.
- [ ] Confirm `git diff --check`, commit every intended source/test/plan change, and push `main`.
- [ ] Reconcile Coolify twice and require the second pass to report no actions.
- [ ] Deploy the exact `origin/main` SHA, run HTTPS smoke tests, and visually verify the dashboard, group switcher, theme, player cards/modal, court editor, and compact closed match on desktop and mobile.
