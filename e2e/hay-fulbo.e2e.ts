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
  await activate(page.getByRole("button", { name: /Nuevo/ }), page);

  await expect(page.getByRole("heading", { name: "Nuevo partido" })).toBeVisible();
  await page.getByRole("button", { name: "Crear partido" }).click();

  await expect(page).toHaveURL(/\/dashboard\/partidos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Equipo 1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Equipo 2", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Los equipos/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /El partido/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /El cierre/ })).toBeVisible();

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
