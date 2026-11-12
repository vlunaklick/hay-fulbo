import { expect, test } from "@playwright/test";

test("a failed background poll keeps open drafts", async ({ page }, testInfo) => {
  const runId = `poll-${testInfo.project.name}-${Date.now()}`;
  await page.goto("/login");
  await page.getByRole("tab", { name: "Registrarme" }).click();
  await page.getByLabel("Nombre").fill("Org Poll");
  await page.getByLabel("Email").fill(`${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("fulbo-e2e-seguro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await page.getByLabel(/^Nombre/).fill(`Grupo ${runId}`);
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page.getByRole("heading", { name: "Resumen del grupo" })).toBeVisible();
  await page.goto("/dashboard/partidos");
  await page.getByRole("button", { name: /^Crear / }).click();
  await expect(page).toHaveURL(/\/dashboard\/partidos\/[0-9a-f-]{36}$/);

  await page.getByRole("button", { name: "Editar datos" }).click();
  await page.getByLabel("Precio total").fill("12345");

  await page.route("**/api/trpc/**matches.detail**", (route) => route.abort());
  await expect(page.getByText("No pudimos actualizar el partido")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Precio total")).toHaveValue(/12\.?345/);

  await page.unroute("**/api/trpc/**matches.detail**");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("No pudimos actualizar el partido")).toBeHidden({ timeout: 15_000 });
  await expect(page.getByLabel("Precio total")).toHaveValue(/12\.?345/);
});

test("a failed background poll keeps modo cancha and its open goal picker", async ({
  page,
}, testInfo) => {
  const runId = `pitch-poll-${testInfo.project.name}-${Date.now()}`;
  await page.goto("/login");
  await page.getByRole("tab", { name: "Registrarme" }).click();
  await page.getByLabel("Nombre").fill("Org Pitch");
  await page.getByLabel("Email").fill(`${runId}@example.com`);
  await page.getByLabel("Contraseña").fill("fulbo-e2e-seguro");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await page.getByLabel(/^Nombre/).fill(`Grupo ${runId}`);
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page.getByRole("heading", { name: "Resumen del grupo" })).toBeVisible();
  await page.goto("/dashboard/partidos");
  await page.getByRole("button", { name: /^Crear / }).click();
  await expect(page).toHaveURL(/\/dashboard\/partidos\/[0-9a-f-]{36}$/);
  await page.goto(`${page.url()}/cancha`);

  await page.getByRole("button", { name: "Sumar un gol a Equipo 1" }).click();
  const picker = page.getByRole("dialog");
  await expect(picker).toBeVisible();

  await page.route("**/api/trpc/**matches.detail**", (route) => route.abort());
  await expect(page.getByText("No pudimos actualizar el marcador")).toBeVisible({
    timeout: 30_000,
  });
  await expect(picker).toBeVisible();
  await expect(page.getByText("No pudimos abrir el modo cancha")).toBeHidden();
});
