import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Jugadores, Grupo, Canchas and Perfil follow the "Próximo paso" shape:
// header → hero number → one next step → rows that open a detail. On a phone the
// detail is a bottom sheet; on desktop it sits in the right column, never empty.

async function expectWcagAA(page: Page) {
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations, JSON.stringify(scan.violations, null, 2)).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
}

async function command<T>(page: Page, name: string, input: unknown): Promise<T> {
  const response = await page.request.post(`/api/trpc/${name}`, { data: input });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).result.data as T;
}

test("an organizer manages players, group, courts and profile from next-step screens", async ({
  page,
}, testInfo) => {
  page.setDefaultTimeout(15000);
  const runId = `${testInfo.project.name}-${Date.now()}`;
  const groupName = `Grupo ${runId}`;
  const desktop = testInfo.project.name === "desktop-chromium";
  const detail = (name: string) => page.getByRole(desktop ? "region" : "dialog", { name });
  await page.addInitScript(() => localStorage.setItem("hay-fulbo-theme", "light"));

  await page.goto("/login");
  await page.getByRole("tab", { name: "Registrarme" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Organizador Grupo");
  await page.getByLabel("Email").fill(`group-screens-${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("fulbo-e2e-seguro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await page.getByLabel("Nombre del grupo", { exact: true }).fill(groupName);
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page.getByRole("button", { name: "Crear y entrar" })).toHaveCount(0);

  // Jugadores: empty state is a next step that creates the first player.
  await page.goto("/dashboard/jugadores");
  await expect(page.getByRole("heading", { level: 1, name: "Jugadores" })).toBeVisible();
  const playersNext = page.getByRole("region", { name: "Próximo paso" });
  await playersNext.getByRole("button", { name: "Sumar jugador" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Beto");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("1 jugador", { exact: true })).toBeVisible();
  // The owner has no account links yet, so inviting is the next step.
  await expect(
    page
      .getByRole("region", { name: "Próximo paso" })
      .getByRole("button", { name: "Invitar a Beto" }),
  ).toBeVisible();
  const betoRow = page.getByRole("button", { name: /^Beto/ });
  if (desktop) {
    // The most played player is open by default.
    await expect(betoRow).toHaveAttribute("aria-current", "true");
  } else {
    await betoRow.click();
    await expect(page).toHaveURL(/[?&]p=/);
  }
  await expect(detail("Beto").getByRole("button", { name: "Editar" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (!desktop) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]p=/);
  }
  await expectWcagAA(page);

  // Grupo: the owner alone gets "invite" as the next step; each topic opens a sheet.
  await page.goto("/dashboard/grupo");
  await expect(page.getByRole("heading", { level: 1, name: groupName })).toBeVisible();
  await expect(page.getByRole("region", { name: "Próximo paso" })).toBeVisible();
  if (desktop) {
    await expect(detail("Integrantes")).toBeVisible();
    await page.getByRole("button", { name: /^Link para sumarse/ }).click();
    await expect(detail("Link para sumarse")).toBeVisible();
    await expect(page).toHaveURL(/tema=invitar/);
  } else {
    await page.getByRole("button", { name: /^Integrantes/ }).click();
    await expect(detail("Integrantes")).toBeVisible();
    await expect(page).toHaveURL(/tema=integrantes/);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.goto("/dashboard/grupo?tema=invitar");
  await expect(detail("Link para sumarse")).toBeVisible();
  if (!desktop) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expectNoHorizontalOverflow(page);
  await expectWcagAA(page);

  // Canchas: with an upcoming match the next step is getting there.
  const court = await command<{ courtId: string }>(page, "matches.execute", {
    type: "upsertCourt",
    name: "Cancha del Grupo",
    address: "Av. Siempreviva 742",
    mapsUrl: "https://example.com/cancha",
  });
  await command(page, "matches.execute", {
    type: "createMatch",
    scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    courtCostMinor: "30000",
    courtId: court.courtId,
  });
  await page.goto("/dashboard/canchas");
  await expect(page.getByRole("heading", { level: 1, name: "Canchas" })).toBeVisible();
  const courtsNext = page.getByRole("region", { name: "Próximo paso" });
  await expect(courtsNext.getByRole("heading", { name: "Cancha del Grupo" })).toBeVisible();
  await expect(courtsNext.getByText("Cómo llegar", { exact: true })).toBeVisible();
  if (!desktop) await page.getByRole("button", { name: /^Cancha del Grupo/ }).click();
  await expect(
    detail("Cancha del Grupo").getByRole("button", { name: /^Copiar dirección/ }),
  ).toBeVisible();
  if (!desktop) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expectNoHorizontalOverflow(page);
  await expectWcagAA(page);

  // Perfil: account rows per group.
  await page.goto("/dashboard/perfil");
  await expect(page.getByRole("heading", { level: 1, name: "Organizador Grupo" })).toBeVisible();
  if (!desktop) await page.getByRole("button", { name: new RegExp(`^${groupName}`) }).click();
  await expect(detail(groupName)).toBeVisible();
  if (!desktop) {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expectNoHorizontalOverflow(page);
  await expectWcagAA(page);
});
