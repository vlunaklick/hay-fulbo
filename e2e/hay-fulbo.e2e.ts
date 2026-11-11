import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectWcagAA(page: Page) {
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations, JSON.stringify(scan.violations, null, 2)).toEqual([]);
}

test("an anonymous visitor reaches an accessible login instead of private pages", async ({
  page,
}) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1, name: /^El partido,/ })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expectWcagAA(page);
});

test("an organizer can create a group and its first match", async ({ page }, testInfo) => {
  const desktop = testInfo.project.name === "desktop-chromium";
  if (desktop) await page.setViewportSize({ width: 1440, height: 900 });
  const runId = `${testInfo.project.name}-${Date.now()}`;
  const email = `e2e-${runId}@example.com`;
  const groupName = `Fulbo E2E ${runId}`;

  await page.goto("/login");
  await page.getByRole("tab", { name: "Registrarme" }).click();
  await page.getByLabel("Nombre").fill("Organizador E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("fulbo-e2e-seguro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Creá el grupo de la fecha")).toBeVisible();
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await page.getByLabel("Nombre").fill(groupName);
  await page.getByRole("button", { name: "Crear y entrar" }).click();

  await expect(page.getByRole("heading", { name: "Resumen del grupo" })).toBeVisible();
  await expectWcagAA(page);
  await expectNoHorizontalOverflow(page);
  if (desktop) await expectNoDocumentScroll(page);

  const dashboardUrl = page.url();
  const themeTrigger = page.getByRole("button", { name: "Tema" });
  await themeTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(dashboardUrl);
  await expect(page.getByRole("menuitemradio", { name: "Oscuro" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(themeTrigger).toBeFocused();
  await expect(page).toHaveURL(dashboardUrl);
  await expect(page.getByRole("heading", { name: "Resumen del grupo" })).toBeVisible();

  const matchesNav = desktop
    ? page.getByRole("link", { name: "Partidos", exact: true })
    : page.getByRole("button", { name: "Partidos", exact: true });
  await activate(matchesNav, page);
  await expect(page).toHaveURL(/\/dashboard\/partidos$/);
  await expect(page.getByRole("heading", { name: "Partidos" })).toBeVisible();
  await expect(page.getByText("Todavía no hay partidos")).toBeVisible();
  await activate(page.getByRole("button", { name: /Nuevo/ }), page);

  await expect(page.getByRole("heading", { name: "Nuevo partido" })).toBeVisible();
  await page.getByRole("button", { name: "Crear partido" }).click();

  await expect(page).toHaveURL(/\/dashboard\/partidos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Equipo 1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Equipo 2", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Los equipos/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /El partido/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /El cierre/ })).toBeVisible();
  if (process.env.MATCH_SCREENSHOT_PHASE) {
    await page.setViewportSize(
      desktop ? { width: 1440, height: 900 } : { width: 375, height: 812 },
    );
    await page.screenshot({
      animations: "disabled",
      scale: "css",
      path: `${process.env.MATCH_SCREENSHOT_DIR}/${process.env.MATCH_SCREENSHOT_PHASE}-${desktop ? "1440" : "375"}.png`,
      fullPage: true,
    });
  }

  const closeButton = page.getByRole("button", { name: /Cerrar partido/ });
  await expect(closeButton).toBeDisabled();
  await closeButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("La hora del partido todavía no pasó.").first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectWcagAA(page);
});

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
}

async function expectNoDocumentScroll(page: Page) {
  const dimensions = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.viewport);
}

async function activate(locator: ReturnType<Page["locator"]>, page: Page) {
  await locator.focus();
  await page.keyboard.press("Enter");
}

async function register(page: Page, name: string, email: string) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Registrarme" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill("fulbo-e2e-seguro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function command<T>(page: Page, name: string, input: unknown): Promise<T> {
  const response = await page.request.post(`/api/trpc/${name}`, { data: input });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).result.data as T;
}

test("a designated planillero scores persisted goals without organizer permissions", async ({
  page,
  browser,
}, testInfo) => {
  page.setDefaultTimeout(15000);
  const runId = `${testInfo.project.name}-${Date.now()}`;
  const desktop = testInfo.project.name === "desktop-chromium";
  await page.setViewportSize(desktop ? { width: 1440, height: 900 } : { width: 375, height: 812 });
  await register(page, "Organizador Planilla", `organizer-${runId}@example.com`);
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await page.getByLabel("Nombre del grupo", { exact: true }).fill(`Planilla ${runId}`);
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page.getByRole("heading", { name: "Resumen del grupo" })).toBeVisible();
  const session = await (await page.request.get("/api/auth/get-session")).json();
  const groupId = session.session.activeOrganizationId;
  const link = await command<{ url: string }>(page, "group.joinLink.renew", { groupId });
  const token = new URL(link.url).pathname.split("/").at(-1)!;

  const scorerContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: desktop ? { width: 1440, height: 900 } : { width: 375, height: 812 },
  });
  await scorerContext.addInitScript(() => localStorage.setItem("hay-fulbo-theme", "light"));
  const scorer = await scorerContext.newPage();
  scorer.setDefaultTimeout(15000);
  try {
    await register(scorer, "Planillero E2E", `scorer-${runId}@example.com`);
    await command(scorer, "group.joinLink.accept", { token });
    const court = await command<{ courtId: string }>(page, "matches.execute", {
      type: "upsertCourt",
      name: "Cancha E2E",
      address: "Buenos Aires",
      mapsUrl: "https://example.com/cancha",
    });
    const created = await command<{ matchId: string; teamIds: string[]; lockVersion: number }>(
      page,
      "matches.execute",
      {
        type: "createMatch",
        scheduledAt: "2026-01-01T20:00:00Z",
        courtCostMinor: "30000",
        courtId: court.courtId,
      },
    );
    let version = created.lockVersion;
    for (const [index, displayName] of ["Beto", "Tito", "Pepe"].entries()) {
      const result = await command<{ lockVersion: number }>(page, "matches.execute", {
        type: "createAndAddParticipant",
        matchId: created.matchId,
        expectedLockVersion: version,
        teamId: created.teamIds[index % 2],
        displayName,
      });
      version = result.lockVersion;
    }
    const matchUrl = `/dashboard/partidos/${created.matchId}`;
    await page.goto(matchUrl);
    const scorekeeperSelect = page.getByRole("combobox", { name: "Planillero", exact: true });
    await expect(scorekeeperSelect).toBeVisible();
    await scorekeeperSelect.click();
    await page.getByRole("option", { name: "Planillero E2E", exact: true }).click();
    await expect(page.getByText("Planillero: Planillero E2E", { exact: true })).toBeVisible();
    await scorer.goto(matchUrl);
    await expect(scorer.getByRole("button", { name: "Cerrar partido", exact: true })).toHaveCount(
      0,
    );
    await expect(scorer.getByRole("combobox", { name: "Planillero", exact: true })).toHaveCount(0);
    await scorer.getByRole("button", { name: "Modo cancha" }).click();
    await expect(scorer).toHaveURL(new RegExp(`${matchUrl}/cancha$`));
    const plus = scorer.getByRole("button", { name: "Sumar un gol a Equipo 1", exact: true });
    const minus = scorer.getByRole("button", { name: "Restar un gol a Equipo 1", exact: true });
    await expect(minus).toBeDisabled();
    for (const author of ["Beto", "Sin autor", "Autogol de Tito"]) {
      await plus.click();
      await expect(scorer.locator("html")).toHaveClass(/light/);
      await expect(scorer.getByRole("dialog")).toHaveCSS("color-scheme", "dark");
      if (!desktop && author === "Beto" && process.env.MATCH_SCREENSHOT_DIR) {
        await scorer.screenshot({
          animations: "disabled",
          scale: "css",
          path: `${process.env.MATCH_SCREENSHOT_DIR}/r2-pitch-light-375.png`,
        });
      }
      await scorer.getByRole("dialog").getByRole("button", { name: author, exact: true }).click();
      await expect(scorer.getByRole("dialog")).toHaveCount(0);
      await expect(plus).toBeFocused();
    }
    await expect(scorer.getByLabel("Marcador de Equipo 1", { exact: true })).toHaveText("3");
    await expect(page.getByLabel("Marcador de Equipo 1", { exact: true })).toHaveText("3", {
      timeout: 12000,
    });
    await scorer.reload();
    await minus.click();
    await expect(
      scorer.getByRole("dialog").getByRole("button", { name: "Beto 1", exact: true }),
    ).toBeVisible();
    if (process.env.MATCH_SCREENSHOT_DIR) {
      await scorer.screenshot({
        animations: "disabled",
        scale: "css",
        path: `${process.env.MATCH_SCREENSHOT_DIR}/restar-${desktop ? "1440" : "375"}.png`,
        fullPage: true,
      });
    }
    await scorer.keyboard.press("Escape");
    await expect(minus).toBeFocused();
    for (const author of ["Beto", "Sin autor", "Autogol de Tito"]) {
      await minus.click();
      await scorer
        .getByRole("dialog")
        .getByRole("button", { name: `${author} 1`, exact: true })
        .click();
      await expect(scorer.getByRole("dialog")).toHaveCount(0);
    }
    await expect(minus).toBeDisabled();
    await expect(plus).toBeFocused();
    await expect(scorer.getByLabel("Marcador de Equipo 1", { exact: true })).toHaveText("0");
    await expectNoHorizontalOverflow(scorer);

    // Exercise conflict recovery without requiring timing-dependent simultaneous clicks.
    await scorer.route(
      "**/api/trpc/matches.execute*",
      async (route) => {
        const body = route.request().postDataJSON();
        body["0"].expectedLockVersion = 0;
        await route.continue({ postData: JSON.stringify(body) });
      },
      { times: 1 },
    );
    await plus.click();
    await scorer.getByRole("dialog").getByRole("button", { name: "Beto", exact: true }).click();
    await expect(scorer.getByText(/Alguien cambió el partido/)).toBeVisible();
    await scorer.getByRole("dialog").getByRole("button", { name: "Beto", exact: true }).click();
    await expect(scorer.getByLabel("Marcador de Equipo 1", { exact: true })).toHaveText("1");
    await expect(page.getByLabel("Marcador de Equipo 1", { exact: true })).toHaveText("1", {
      timeout: 12000,
    });

    await page.getByRole("button", { name: "Opciones de Pepe" }).click();
    await page.getByRole("menuitem", { name: "No vino", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Pepe no vino" })).toBeVisible();
    await page.getByRole("button", { name: "Sí, aporta" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const absenceAction = await page
      .getByRole("button", { name: /Quitar la marca de ausente de Pepe/ })
      .boundingBox();
    expect(absenceAction).not.toBeNull();
    expect(absenceAction!.x + absenceAction!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.getByRole("button", { name: /La caja/ }).click();
    const caja = page.getByRole("dialog", { name: "La caja" });
    await expect(caja.getByText("Ausente · aporta", { exact: true })).toBeVisible();
    await caja.getByRole("button", { name: "Editar pago de Beto" }).click();
    await caja.getByLabel("Pagó Beto").fill("50");
    await caja.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(caja.getByLabel("Pagó Beto")).toHaveCount(0);
    await expect(caja.getByText("Parcial", { exact: true })).toBeVisible();
    await expect(caja).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (process.env.MATCH_SCREENSHOT_DIR) {
      await page.screenshot({
        animations: "disabled",
        scale: "css",
        path: `${process.env.MATCH_SCREENSHOT_DIR}/caja-${desktop ? "1440" : "375"}.png`,
        fullPage: false,
      });
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Cerrar partido", exact: true })).toBeEnabled();
    if (process.env.MATCH_SCREENSHOT_DIR) {
      await page.screenshot({
        animations: "disabled",
        scale: "css",
        path: `${process.env.MATCH_SCREENSHOT_DIR}/planillero-match-${desktop ? "1440" : "375"}.png`,
        fullPage: true,
      });
      await scorer.screenshot({
        animations: "disabled",
        scale: "css",
        path: `${process.env.MATCH_SCREENSHOT_DIR}/cancha-${desktop ? "1440" : "375"}.png`,
        fullPage: true,
      });
    }
  } finally {
    await scorerContext.close();
  }
});

test("a polled match preserves stale drafts until an explicit conflict retry", async ({
  page,
  browser,
}, testInfo) => {
  const runId = `conflict-${testInfo.project.name}-${Date.now()}`;
  await register(page, "Organizador Conflicto", `${runId}@example.com`);
  const group = await command<{ id: string }>(page, "group.create", { name: runId, slug: runId });
  const link = await command<{ url: string }>(page, "group.joinLink.renew", { groupId: group.id });
  const managerContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  try {
    const manager = await managerContext.newPage();
    await register(manager, "Responsable Conflicto", `manager-${runId}@example.com`);
    await command(manager, "group.joinLink.accept", {
      token: new URL(link.url).pathname.split("/").at(-1),
    });
    const membersResponse = await page.request.get(
      `/api/auth/organization/list-members?organizationId=${group.id}`,
    );
    expect(membersResponse.ok()).toBe(true);
    const { members } = await membersResponse.json();
    const membership = members.find(
      (member: { user: { name: string } }) => member.user.name === "Responsable Conflicto",
    );
    await command(page, "group.updateMemberRole", {
      groupId: group.id,
      membershipId: membership.id,
      role: "leader",
    });
    const match = await command<{ matchId: string }>(page, "matches.execute", {
      type: "createMatch",
      scheduledAt: "2026-11-12T20:00:00Z",
      courtCostMinor: "1000000",
    });
    const url = `/dashboard/partidos/${match.matchId}`;
    await page.goto(url);
    await manager.goto(url);
    await page.getByRole("button", { name: "Editar datos", exact: true }).click();
    await page.getByLabel("Precio total").fill("12000");
    await manager.getByRole("button", { name: "Editar datos", exact: true }).click();
    await manager.getByLabel("Precio total").fill("15000");
    const polled = page.waitForResponse(async (response) => {
      if (!response.url().includes("matches.detail") || !response.ok()) return false;
      return (await response.text()).includes('"courtCostMinor":"1500000"');
    });
    await manager.getByRole("button", { name: "Guardar datos", exact: true }).click();
    await expect(manager.getByRole("button", { name: "Editar datos", exact: true })).toBeVisible();
    await polled;
    await expect(page.getByLabel("Precio total")).toHaveValue("12000");
    const conflict = page.waitForResponse(
      (response) => response.url().includes("matches.execute") && response.status() === 409,
    );
    await page.getByRole("button", { name: "Guardar datos", exact: true }).click();
    await conflict;
    await expect(page.getByText(/Alguien cambió el partido/)).toBeVisible();
    await expect(page.getByLabel("Precio total")).toHaveValue("12000");
    const readCost = async () => {
      const response = await manager.request.get(
        `/api/trpc/matches.detail?input=${encodeURIComponent(JSON.stringify({ matchId: match.matchId }))}`,
      );
      return (await response.json()).result.data.courtCostMinor;
    };
    expect(await readCost()).toBe("1500000");
    await page.getByRole("button", { name: "Guardar datos", exact: true }).click();
    await expect(page.getByRole("button", { name: "Editar datos", exact: true })).toBeVisible();
    expect(await readCost()).toBe("1200000");
  } finally {
    await managerContext.close();
  }
});
