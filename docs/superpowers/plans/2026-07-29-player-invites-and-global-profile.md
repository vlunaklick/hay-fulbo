# Player Invites and Global Profile Implementation Plan

> **For agentic workers:** Keep this implementation lean. Do not add an E2E suite per screen; use focused unit/integration coverage for security-sensitive logic, typecheck, and one manual browser pass.

**Goal:** Let an Organizer invite a specific player by link and let each signed-in user see their own linked statistics across every group.

**Architecture:** Extend Better Auth organization invitations with an optional `playerId` field. Better Auth continues to own expiry, email matching, one-time acceptance, membership creation, and opaque invitation IDs; an acceptance hook links the invited player to the accepted account inside the correct group scope. Build global stats by composing the existing per-group directory/player stats queries for every group membership, so tenant isolation remains intact.

**Tech Stack:** Better Auth organization plugin, Drizzle/PostgreSQL, tRPC, TanStack Query, Next.js App Router, shadcn/ui.

---

### Task 1: Tie invitations to players

**Files:**
- Modify: `packages/db/src/schema/auth.ts`
- Create: next Drizzle migration and journal entry
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/api/src/group-access.ts`
- Modify: `packages/api/src/access-runtime.ts`
- Modify: `packages/api/src/routers/index.ts`
- Test: `packages/api/src/group-access.test.ts`

- [ ] Add nullable invitation `playerId` storage and expose it as an optional Better Auth invitation additional field.
- [ ] Require the Organizer role and validate that the selected player belongs to the group before creating an invitation.
- [ ] Include `playerId` in the Better Auth invitation; keep the public URL opaque and expiring.
- [ ] In `afterAcceptInvitation`, set the group RLS scope and link that player to the accepting user. Reject cross-group targets and preserve the one-account-per-player/group constraint.
- [ ] Extend unit/integration coverage for existing account, signup email mismatch, cross-group player, already-linked player, expiry, and successful auto-link.

### Task 2: Invitation acceptance and signup return

**Files:**
- Create: `apps/web/src/app/invitaciones/[invitationId]/page.tsx`
- Create: `apps/web/src/components/invitation-acceptance.tsx`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/components/directory-page.tsx`

- [ ] Add an Organizer-only email action inside the player dialog that creates the invitation and copies/shows the returned link.
- [ ] If the invitation visitor is signed out, redirect to `/login?returnTo=/invitaciones/...`.
- [ ] After sign-in or sign-up, return only to a validated same-origin invitation path.
- [ ] Show the group/player human labels, accept button, expired/used/error states, and a successful redirect into the selected group.
- [ ] Never render database IDs or the player-link sentinel.

### Task 3: Global personal statistics

**Files:**
- Modify: `packages/api/src/routers/stats.ts`
- Create: `apps/web/src/app/dashboard/perfil/page.tsx`
- Create: `apps/web/src/components/global-profile.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`

- [ ] Add `stats.global` for the authenticated user: list their groups, find the player linked to their account in each group, call the existing player stats query within that group scope, and aggregate played, goals, assists, G+A, W/D/L, and win percentage.
- [ ] Return a per-group breakdown with human group/player names and zero-safe totals.
- [ ] Add `Mi perfil` to the account control in the app shell without crowding the mobile bottom navigation.
- [ ] Render global totals and a compact per-group breakdown; explain that unlinked groups do not count.
- [ ] Targetedly invalidate profile stats after invitation acceptance or player-account linking.

### Task 4: Verify and release with the main UI batch

- [ ] Run schema/migration tests, group-access tests, stats tests, typecheck, lint/format, existing happy-path/theme E2E, and the Docker build.
- [ ] Manually verify invite existing account, invite signup return, auto-link, and the multi-group profile.
- [ ] Include migrations in the same exact-SHA Coolify release and verify production health.
