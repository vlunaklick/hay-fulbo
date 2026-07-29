type DatabaseProbe = () => Promise<void>;

const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

async function probeDatabase() {
  const { checkDatabaseConnection } = await import("@hay-fulbo/db");
  await checkDatabaseConnection();
}

export function createHealthHandler(probe: DatabaseProbe) {
  return async function health() {
    try {
      await probe();
      return Response.json({ status: "ok" }, { status: 200, headers });
    } catch {
      return Response.json({ status: "unavailable" }, { status: 503, headers });
    }
  };
}

export const GET = createHealthHandler(probeDatabase);
