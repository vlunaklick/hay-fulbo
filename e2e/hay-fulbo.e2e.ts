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
  await expect(page.getByRole("heading", { name: "El partido, bajo control." })).toBeVisible();
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
  await activate(page.locator('a[href="/dashboard/partidos/nuevo"]:visible').first(), page);

  await expect(page).toHaveURL(/\/dashboard\/partidos\/nuevo$/);
  await page.getByLabel("Precio total de la cancha").fill("48000");
  await page.getByRole("button", { name: "Crear partido" }).click();

  await expect(page).toHaveURL(/\/dashboard\/partidos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Oscuros", { exact: true })).toBeVisible();
  await expect(page.getByText("Claros", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Convocatoria/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Ficha/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Plantel/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Caja/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Juego/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Cómo llegan/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Revisar cierre/ })).toBeVisible();

  const sheetTriggers = [
    { button: /^Convocatoria/, heading: "Convocatoria" },
    { button: /^Ficha/, heading: "Ficha del partido" },
    { button: /^Plantel/, heading: "Plantel" },
    { button: /^Caja/, heading: "Caja" },
    { button: /^Juego/, heading: "Juego" },
    { button: /^Cómo llegan/, heading: "Cómo llegan" },
  ];
  for (const item of sheetTriggers) {
    const trigger = page.getByRole("button", { name: item.button });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: item.heading }).first()).toBeVisible();
    await expect
      .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }

  const closureTrigger = page.getByRole("button", { name: /^Revisar cierre/ });
  await closureTrigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Revisar cierre" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  await expectNoHorizontalOverflow(page);
  if (desktop) await expectNoDocumentScroll(page);
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
