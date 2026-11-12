import { expect, test, type Page } from "@playwright/test";

async function command<T>(page: Page, name: string, input: unknown): Promise<T> {
  const response = await page.request.post(`/api/trpc/${name}`, { data: input });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).result.data as T;
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

test("only scorers get Cargar goles on a live fecha", async ({ page, browser }, testInfo) => {
  const runId = `live-${testInfo.project.name}-${Date.now()}`;
  await register(page, "Org", `org-${runId}@example.com`);
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await page.getByLabel(/^Nombre/).fill(`G ${runId}`);
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /^La fecha de / })).toBeVisible();
  const session = await (await page.request.get("/api/auth/get-session")).json();
  const link = await command<{ url: string }>(page, "group.joinLink.renew", {
    groupId: session.session.activeOrganizationId,
  });
  await command(page, "matches.execute", {
    type: "createMatch",
    scheduledAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  });
  await page.goto("/dashboard");
  const fecha = page.getByRole("region", { name: "Próximo paso" });
  await expect(fecha).toContainText("En juego");
  await expect(fecha.getByRole("button", { name: "Cargar goles" })).toBeVisible();

  const context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const member = await context.newPage();
  await register(member, "Miembro", `member-${runId}@example.com`);
  await command(member, "group.joinLink.accept", {
    token: new URL(link.url).pathname.split("/").at(-1),
  });
  await member.goto("/dashboard");
  const memberFecha = member.getByRole("region", { name: "Próximo paso" });
  await expect(memberFecha).toContainText("En juego");
  await expect(memberFecha.getByRole("button", { name: "Ver partido" })).toBeVisible();
  await expect(memberFecha.getByRole("button", { name: "Cargar goles" })).toHaveCount(0);
  await context.close();
});
