# Matchday Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Hay Fulbo into a complete manual matchday loop: share a free WhatsApp-ready invitation, collect attendance, expose capacity and calendar actions, run a one-handed pitch mode, share the result, and turn history into parity simulations and player societies.

**Architecture:** Add attendance as a tenant-scoped match aggregate and authorize public RSVP through a signed, match-specific capability; no WhatsApp API or automated sending is introduced. Keep browser integrations in pure utilities and event handlers, derive parity/societies from existing closed-match data, and expose focused React components instead of growing the current match and statistics pages further.

**Tech Stack:** Bun, TypeScript, Next.js 16 App Router, React 19, tRPC 11, TanStack Query 5, Drizzle ORM, PostgreSQL, Tailwind CSS 4, Bun Test, Playwright.

**Product decisions captured here:** WhatsApp is manual and free; the app only prepares text/links and opens the user's share flow. Attendance is writable through a private match capability without requiring an account. “Pronóstico” uses non-purchasable fictional points with no deposits, currency, prizes or cash-out. The public invitation exposes match logistics and active player display names, but never emails, account IDs, payment state or private group administration.

---

## File map

- `packages/db/src/schema/domain.ts`: match capacity and tenant-scoped RSVP rows.
- `packages/db/src/matches/types.ts`: serialized capacity and RSVP types.
- `packages/db/src/matches/queries.ts`: load RSVP state with match detail.
- `packages/db/src/matches/commands.ts`: keep manual roster changes consistent with RSVP.
- `packages/db/src/stats/insights.ts`: pure Elo-style parity and pair-society derivation.
- `packages/db/src/stats/insights.test.ts`: deterministic insight tests.
- `packages/db/src/stats/types.ts`: parity and society result contracts.
- `packages/db/src/stats/queries.ts`: member-authorized parity query.
- `packages/db/src/migrations/migration.test.ts`: forced-RLS assertions for RSVP.
- `packages/api/src/match-invite-access.ts`: signed capability, public preview and RSVP use cases.
- `packages/api/src/match-invite-access.test.ts`: capability tampering and RSVP behavior.
- `packages/api/src/access-runtime.ts`: Drizzle-backed invite repository.
- `packages/api/src/context.ts`: expose match invite access.
- `packages/api/src/routers/index.ts`: public invite procedures.
- `packages/api/src/routers/matches.ts`: capacity mutations and invitation URL.
- `packages/api/src/routers/stats.ts`: member parity endpoint.
- `apps/web/src/lib/match-sharing.ts`: WhatsApp text, ICS, result SVG and browser actions.
- `apps/web/src/lib/match-sharing.test.ts`: escaping and deterministic artifact tests.
- `apps/web/src/components/match-attendance-panel.tsx`: capacity meter and organizer share action.
- `apps/web/src/components/match-parity-card.tsx`: parity and fictional-points simulator.
- `apps/web/src/components/match-result-card.tsx`: visible/downloadable result recap.
- `apps/web/src/components/pitch-mode.tsx`: one-handed live score controls.
- `apps/web/src/components/match-invitation.tsx`: public invitation and RSVP UI.
- `apps/web/src/components/societies-page.tsx`: pair insights.
- `apps/web/src/app/jugar/[token]/page.tsx`: public capability route.
- `apps/web/src/app/dashboard/partidos/[matchId]/cancha/page.tsx`: pitch mode route.
- `apps/web/src/app/dashboard/estadisticas/sociedades/page.tsx`: society route.
- `apps/web/src/app/dashboard/partidos/[matchId]/page.tsx`: compose the new panels and links.
- `apps/web/src/components/home-dashboard.tsx`: discoverability for societies.
- `e2e/hay-fulbo.e2e.ts`: invitation and matchday smoke coverage.

### Task 1: Persist capacity and RSVP state

**Files:**
- Modify: `packages/db/src/schema/domain.ts`
- Modify: `packages/db/src/matches/types.ts`
- Modify: `packages/db/src/matches/queries.ts`
- Modify: `packages/db/src/matches/commands.ts`
- Test: `packages/db/src/matches/commands.integration.test.ts`
- Generate: `packages/db/src/migrations/0005_*.sql`

- [ ] **Step 1: Write failing schema and command tests**

Assert that a match defaults to ten places, capacity accepts 2–40, adding a participant records a positive RSVP, and removing that participant removes the RSVP. Extend `migration.test.ts` to require `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` and a tenant policy for `match_rsvp`.

- [ ] **Step 2: Run the focused tests**

Run: `bun test packages/db/src/schema/schema.test.ts packages/db/src/migrations/migration.test.ts packages/db/src/matches/commands.integration.test.ts`

Expected: FAIL because capacity and `match_rsvp` do not exist.

- [ ] **Step 3: Add the schema**

Add `match.capacity`, `rsvp_response` (`yes`, `maybe`, `no`) and `match_rsvp` keyed by `(group_id, match_id, player_id)`, with tenant-aware foreign keys, timestamps and indexes.

- [ ] **Step 4: Extend match commands and queries**

Serialize:

```ts
type MatchRsvp = {
  playerId: string;
  playerDisplayName: string;
  response: "yes" | "maybe" | "no";
  respondedAt: Date;
};
```

Accept `capacity` in create/update commands and synchronize manual add/remove participant operations.

- [ ] **Step 5: Generate and verify migration**

Run: `bun run db:generate`, then append explicit SQL to enable and force RLS on `match_rsvp` and create a `match_rsvp_group_scope` `USING`/`WITH CHECK` policy against `app.group_id`.

Expected: one new migration containing only match capacity, RSVP enum/table, constraints, indexes, explicit forced RLS and its tenant policy.

- [ ] **Step 6: Run tests**

Run: `bun test packages/db/src/schema/schema.test.ts packages/db/src/migrations/migration.test.ts packages/db/src/matches/commands.integration.test.ts`

Expected: PASS.

### Task 2: Add the signed public invitation capability

**Files:**
- Create: `packages/api/src/match-invite-access.ts`
- Create: `packages/api/src/match-invite-access.test.ts`
- Modify: `packages/api/src/access-runtime.ts`
- Modify: `packages/api/src/context.ts`
- Modify: `packages/api/src/routers/index.ts`
- Modify: `packages/api/src/routers/matches.ts`

- [ ] **Step 1: Write capability tests**

Cover signed URL creation, tamper rejection, open-match preview, response upsert, invalid player rejection and closed-match rejection.

- [ ] **Step 2: Run the test**

Run: `bun test packages/api/src/match-invite-access.test.ts`

Expected: FAIL because the access module does not exist.

- [ ] **Step 3: Implement the use-case boundary**

Use HMAC-SHA256 with `BETTER_AUTH_SECRET`; encode only `groupId` and `matchId`. Expose:

```ts
createUrl(input: { groupId: string; matchId: string }): string;
preview(token: string): Promise<MatchInvitation>;
respond(token: string, playerId: string, response: RsvpResponse): Promise<MatchInvitation>;
```

The repository sets `app.group_id` only after signature verification and never exposes emails, payment state or private user IDs.

The public DTO is:

```ts
type MatchInvitation = {
  group: { name: string; timeZone: string; currency: string };
  match: {
    id: string;
    scheduledAt: Date;
    status: "open" | "closed" | "cancelled";
    capacity: number;
    courtCostMinor: string | null;
    estimatedPerPlayerMinor: string | null;
    court: { name: string; address: string; mapsUrl: string } | null;
    teams: { displayName: string; goals: number }[];
  };
  players: {
    id: string;
    displayName: string;
    response: "yes" | "maybe" | "no" | null;
    place: "playing" | "waitlist" | null;
    respondedAt: Date | null;
  }[];
  summary: {
    playing: number;
    waitlisted: number;
    maybe: number;
    no: number;
    remaining: number;
  };
};
```

Only non-archived players are eligible and exposed, sorted by normalized name. Positive responses are ordered by `respondedAt ASC, playerId ASC`; the first `capacity` are `playing` and the remainder are `waitlist`. Repeating `yes` is idempotent and preserves the original timestamp/place; transitioning from `maybe` or `no` to `yes` receives a new timestamp and joins the end. `remaining = max(capacity - playing, 0)`. Estimated cost is `ceil(courtCostMinor / capacity)` and is explicitly presented as an estimate; actual contribution continues to use the existing participant proration.

- [ ] **Step 4: Add tRPC procedures**

Add a protected URL query for group members plus public `preview` and `respond` procedures with bounded token input.

- [ ] **Step 5: Run tests**

Run: `bun test packages/api/src/match-invite-access.test.ts packages/api/src/group-join-access.test.ts`

Expected: PASS.

### Task 3: Build free sharing, calendar and invitation UI

**Files:**
- Create: `apps/web/src/lib/match-sharing.ts`
- Create: `apps/web/src/lib/match-sharing.test.ts`
- Create: `apps/web/src/components/match-attendance-panel.tsx`
- Create: `apps/web/src/components/match-invitation.tsx`
- Create: `apps/web/src/app/jugar/[token]/page.tsx`
- Modify: `apps/web/src/app/dashboard/partidos/[matchId]/page.tsx`
- Modify: `apps/web/src/app/dashboard/partidos/nuevo/page.tsx`

- [ ] **Step 1: Write utility tests**

Verify WhatsApp text contains date, time, court, cost, capacity state and invitation URL; verify ICS escaping and CRLF output.

- [ ] **Step 2: Run the tests**

Run: `bun test apps/web/src/lib/match-sharing.test.ts`

Expected: FAIL because the utilities do not exist.

- [ ] **Step 3: Implement pure builders and event-driven browser actions**

Provide `buildMatchMessage`, `buildWhatsAppUrl`, `buildCalendarIcs`, `downloadCalendar` and `shareOrCopy`. Do not introduce WhatsApp Business, background jobs or `useEffect`.

- [ ] **Step 4: Build the public “pizarra” invitation**

Show date/time, court/Maps, per-player estimate, capacity meter, confirmed/waitlist/maybe states, player selector and three RSVP actions. Use optimistic feedback only after the server confirms the mutation.

- [ ] **Step 5: Compose the organizer panel**

Add capacity control, copy/share buttons and the same attendance meter to the private match page. Preserve the existing five-tab workflow.

- [ ] **Step 6: Run types and tests**

Run: `bun test apps/web/src/lib/match-sharing.test.ts && bun run check-types`

Expected: PASS.

### Task 4: Add pitch mode and result card

**Files:**
- Create: `apps/web/src/components/pitch-mode.tsx`
- Create: `apps/web/src/components/match-result-card.tsx`
- Create: `apps/web/src/app/dashboard/partidos/[matchId]/cancha/page.tsx`
- Modify: `apps/web/src/lib/match-sharing.ts`
- Modify: `apps/web/src/lib/match-sharing.test.ts`
- Modify: `apps/web/src/app/dashboard/partidos/[matchId]/page.tsx`

- [ ] **Step 1: Write SVG/result-card tests**

Assert XML escaping, score and player-summary output.

- [ ] **Step 2: Implement pitch mode**

Use full-viewport, high-contrast score controls. Increment unattributed goals with the existing versioned command, expose one-step undo, vibrate only from the click handler and offer a fullscreen button. Query invalidation must target match detail and stats.

- [ ] **Step 3: Implement the result recap**

Render a visible result card, generate a downloadable SVG and use the Web Share API when file sharing is supported. Fall back to downloading and copying the summary.

- [ ] **Step 4: Run focused tests and types**

Run: `bun test apps/web/src/lib/match-sharing.test.ts && bun run check-types`

Expected: PASS.

### Task 5: Derive parity and societies from match history

**Files:**
- Create: `packages/db/src/stats/insights.ts`
- Create: `packages/db/src/stats/insights.test.ts`
- Modify: `packages/db/src/stats/types.ts`
- Modify: `packages/db/src/stats/derive.ts`
- Modify: `packages/db/src/stats/queries.ts`
- Modify: `packages/api/src/routers/stats.ts`

- [ ] **Step 1: Write deterministic insight tests**

Cover equal team win probabilities, rating changes after repeated results, low-confidence cold starts, exact probability normalization, pair minimum-sample filtering and the full society tie-break sequence.

- [ ] **Step 2: Run tests**

Run: `bun test packages/db/src/stats/insights.test.ts`

Expected: FAIL because the insight module does not exist.

- [ ] **Step 3: Implement explainable parity**

Replay closed matches chronologically into a group-local Elo rating:

- initialize every player at `1000`;
- team rating is the arithmetic mean of its participating player ratings;
- expected A is `1 / (1 + 10 ** ((ratingB - ratingA) / 400))`;
- actual A is `1`, `0.5` or `0` for win, draw or loss;
- update every player on A by `24 * (actualA - expectedA)` and every player on B by the negative amount;
- skip malformed matches without exactly two non-empty teams.

For the requested open match, require both teams to contain a player. Calculate `draw = 0.12 + 0.16 * exp(-abs(ratingGap) / 200)`, `teamA = (1 - draw) * expectedA` and `teamB = (1 - draw) * (1 - expectedA)`; correct only floating-point residue so the three values sum to one. Equal cold-start teams therefore produce `36% / 28% / 36%`, not a misleading two-outcome 50/50. Return rating gap, unique historical matches involving current players and `low | medium | high` confidence based on average closed appearances per current player: `<3`, `3–7.99`, `>=8`. Treat the result as a simulation, not truth.

- [ ] **Step 4: Implement societies**

Aggregate same-team pairs with matches, wins, draws, losses, points (`3/1/0`), win percentage, goal difference and combined contributions. Require at least two matches. Define “strongest” and every UI order with this exact descending sequence: points, win percentage, goal difference, combined contributions, matches played; break the final tie by the normalized concatenated player names ascending and then the sorted player-ID key ascending.

- [ ] **Step 5: Expose results**

Add societies to the stats dashboard result and a member-authorized `stats.parity({ matchId })` query.

- [ ] **Step 6: Run stats tests**

Run: `bun test packages/db/src/stats && bun run check-types`

Expected: PASS.

### Task 6: Build the parity simulator and societies UI

**Files:**
- Create: `apps/web/src/components/match-parity-card.tsx`
- Create: `apps/web/src/components/societies-page.tsx`
- Create: `apps/web/src/app/dashboard/estadisticas/sociedades/page.tsx`
- Modify: `apps/web/src/app/dashboard/partidos/[matchId]/page.tsx`
- Modify: `apps/web/src/components/home-dashboard.tsx`

- [ ] **Step 1: Build the fictional-points simulator**

Show three selectable outcomes (team A, draw, team B) with probabilities and confidence. Allow an integer stake of 10–1000 non-purchasable points. For the selected outcome, calculate the fair fictional multiplier as `1 / probability` and total return as `round(stake / probability)`; display both total return and `return - stake` gain. Use “Pronóstico” and “Puntos”; never use currency, deposits, cash-out, prizes or real-money controls. Do not persist predictions in this slice.

- [ ] **Step 2: Build societies**

Show the strongest pairs, minimum sample and record together. Use a compact podium plus a scannable list, not another generic metric dashboard.

- [ ] **Step 3: Add discoverability**

Compose parity in the match page and link “Sociedades” from the home stats area without rewriting the dirty statistics dashboard.

- [ ] **Step 4: Run types**

Run: `bun run check-types`

Expected: PASS.

### Task 7: Verify the complete loop

**Files:**
- Modify: `e2e/hay-fulbo.e2e.ts`
- Modify only as needed: feature files above

- [ ] **Step 1: Add an E2E smoke path**

Create a group/match, set capacity, obtain the invitation, submit RSVP, verify the meter, open pitch mode, add/undo a goal, and confirm the calendar/share controls are reachable. Close a seeded match and verify its result-card control; seed enough history to verify a parity simulation and at least one society.

- [ ] **Step 2: Run focused E2E**

Run: `bun run test:e2e -- --grep "matchday loop"`

Expected: PASS with PostgreSQL and the dev server available.

- [ ] **Step 3: Run the full repository gate**

Run: `bun run check && bun run test && bun run build`

Expected: PASS.

- [ ] **Step 4: Review the working tree**

Run: `git status --short && git diff --check`

Expected: only intended matchday-loop changes plus the user's pre-existing modifications; no whitespace errors.
