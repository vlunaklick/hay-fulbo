import { describe, expect, mock, test } from "bun:test";

const email = "duenio@example.com";

mock.module("@clerk/backend", () => ({
  createClerkClient: () => ({
    users: {
      getUser: async () => ({
        id: "user_clerk",
        firstName: "Dueño",
        lastName: null,
        imageUrl: "",
        hasImage: false,
        primaryEmailAddressId: "idn_1",
        emailAddresses: [
          { id: "idn_1", emailAddress: email, verification: { status: "verified" } },
        ],
      }),
    },
  }),
  verifyToken: async () => ({ sub: "user_clerk" }),
}));

const { betterAuth } = await import("better-auth");
const { memoryAdapter } = await import("better-auth/adapters/memory");
const { clerkBridge } = await import("./clerk-bridge");

function post(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost:3000/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("clerkBridge", () => {
  test("a password sign-in racing the takeover of a squatted account gets no session", async () => {
    let releaseVerify!: () => void;
    let verifyStarted!: () => void;
    const started = new Promise<void>((resolve) => (verifyStarted = resolve));
    let pauseNextVerify = false;
    const db = { user: [], session: [], account: [], verification: [] };
    const auth = betterAuth({
      baseURL: "http://localhost:3000",
      secret: "test-secret-at-least-32-characters-long",
      database: memoryAdapter(db),
      emailAndPassword: {
        enabled: true,
        password: {
          hash: async (password) => `h:${password}`,
          verify: async ({ hash, password }) => {
            if (pauseNextVerify) {
              verifyStarted();
              await new Promise<void>((resolve) => (releaseVerify = resolve));
            }
            return hash === `h:${password}`;
          },
        },
      },
      plugins: [clerkBridge({ secretKey: "sk_test_x", authorizedParties: [] })],
    });

    const squatter = { email, password: "squatter-password", name: "Squatter" };
    expect((await auth.handler(post("/sign-up/email", squatter))).status).toBe(200);

    pauseNextVerify = true;
    const racingSignIn = auth.handler(post("/sign-in/email", squatter));
    await started;
    const exchange = await auth.handler(post("/clerk/exchange", { token: "clerk-token" }));
    expect(exchange.status).toBe(200);
    releaseVerify();
    const signIn = await racingSignIn;

    const cookie = signIn.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session).toBeNull();
    expect(signIn.status).toBe(401);
  });
});
