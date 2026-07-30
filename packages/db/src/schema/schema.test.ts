import { describe, expect, test } from "bun:test";
import { getTableConfig } from "drizzle-orm/pg-core";

import {
  court,
  groupSharedLink,
  invitation,
  match,
  matchAppearance,
  matchRsvp,
  matchOrganizerTransfer,
  matchTeam,
  matchTransition,
  member,
  organization,
  player,
  session,
} from "./index";

describe("Better Auth Organization persistence", () => {
  test("exposes the Organization models and active group on sessions", () => {
    expect(organization.id.name).toBe("id");
    expect(member.organizationId.name).toBe("organization_id");
    expect(invitation.status.name).toBe("status");
    expect(session.activeOrganizationId.name).toBe("active_organization_id");
  });

  test("stores stable group settings on the canonical organization row", () => {
    expect(organization.currencyCode.notNull).toBe(true);
    expect(organization.timeZone.notNull).toBe(true);
    expect(organization.archivedAt.notNull).toBe(false);
  });
});

describe("Hay Fulbo persistence seam", () => {
  test("exports every domain table from one schema", () => {
    expect(
      [
        player,
        court,
        match,
        matchTeam,
        matchAppearance,
        matchRsvp,
        matchTransition,
        matchOrganizerTransfer,
        groupSharedLink,
      ].map((table) => getTableConfig(table).name),
    ).toEqual([
      "player",
      "court",
      "match",
      "match_team",
      "match_appearance",
      "match_rsvp",
      "match_transition",
      "match_organizer_transfer",
      "group_shared_link",
    ]);
  });

  test("keeps money out of JavaScript numbers", () => {
    expect(match.courtCostMinor.dataType).toBe("bigint");
    expect(matchAppearance.expectedMinor.dataType).toBe("bigint");
    expect(matchAppearance.paidMinor.dataType).toBe("bigint");
  });

  test("declares tenant-aware foreign keys and database checks", () => {
    const appearance = getTableConfig(matchAppearance);
    const rsvp = getTableConfig(matchRsvp);
    const foreignKeyColumns = appearance.foreignKeys.map((foreignKey) =>
      foreignKey.reference().columns.map((column) => column.name),
    );

    expect(foreignKeyColumns).toContainEqual(["group_id", "match_id"]);
    expect(foreignKeyColumns).toContainEqual(["group_id", "player_id"]);
    expect(foreignKeyColumns).toContainEqual(["group_id", "match_id", "team_id"]);
    expect(appearance.checks.map((constraint) => constraint.name)).toEqual(
      expect.arrayContaining([
        "match_appearance_joined_order_positive",
        "match_appearance_goals_nonnegative",
        "match_appearance_assists_nonnegative",
        "match_appearance_own_goals_nonnegative",
        "match_appearance_expected_minor_nonnegative",
        "match_appearance_paid_minor_nonnegative",
      ]),
    );
    expect(
      rsvp.foreignKeys.map((foreignKey) =>
        foreignKey.reference().columns.map((column) => column.name),
      ),
    ).toEqual(
      expect.arrayContaining([
        ["group_id", "match_id"],
        ["group_id", "player_id"],
      ]),
    );
    expect(getTableConfig(match).checks.map((constraint) => constraint.name)).toContain(
      "match_capacity_allowed",
    );
  });

  test("makes the shared-link secret a unique 32-byte hash contract", () => {
    expect(groupSharedLink.tokenHash.notNull).toBe(true);
    expect(getTableConfig(groupSharedLink).checks.map((constraint) => constraint.name)).toContain(
      "group_shared_link_token_hash_32_bytes",
    );
    expect(
      getTableConfig(groupSharedLink).uniqueConstraints.map((constraint) => constraint.name),
    ).toContain("group_shared_link_token_hash_unique");
  });
});
