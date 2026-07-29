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

  await expect(page.getByRole("heading", { name: "Partidos" })).toBeVisible();
  await expect(page.getByText("Todavía no hay partidos")).toBeVisible();
  await expectWcagAA(page);
  await page.locator('a[href="/dashboard/partidos/nuevo"]').first().click();

  await expect(page).toHaveURL(/\/dashboard\/partidos\/nuevo$/);
  await page.getByLabel("Precio total de la cancha").fill("48000");
  await page.getByRole("button", { name: "Crear partido" }).click();

  await expect(page).toHaveURL(/\/dashboard\/partidos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Oscuros")).toBeVisible();
  await expect(page.getByText("Claros")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Plantel" })).toBeVisible();
  await expectWcagAA(page);
});
