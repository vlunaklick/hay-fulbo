import { sharedAccess } from "@hay-fulbo/api/access-runtime";
import {
  SHARED_ACCESS_COOKIE,
  sharedAccessCookieOptions,
  sharedResponseHeaders,
} from "@hay-fulbo/api/shared-http";
import { env } from "@hay-fulbo/env/server";
import { NextRequest, NextResponse } from "next/server";

async function readToken(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body: unknown = await request.json();
    return typeof body === "object" &&
      body !== null &&
      "token" in body &&
      typeof body.token === "string"
      ? body.token
      : null;
  }
  const form = await request.formData();
  const token = form.get("token");
  return typeof token === "string" ? token : null;
}

function cleanRedirect(request: NextRequest) {
  return new URL("/compartido", request.url);
}

export async function POST(request: NextRequest) {
  const token = await readToken(request).catch(() => null);
  if (!token) {
    return NextResponse.json(
      { error: "Shared access is invalid" },
      { headers: sharedResponseHeaders, status: 400 },
    );
  }

  const context = await sharedAccess.authenticate(token).catch(() => null);
  if (!context) {
    return NextResponse.json(
      { error: "Shared access is invalid" },
      { headers: sharedResponseHeaders, status: 401 },
    );
  }

  const response = NextResponse.redirect(cleanRedirect(request), {
    headers: sharedResponseHeaders,
    status: 303,
  });
  response.cookies.set(
    SHARED_ACCESS_COOKIE,
    token,
    sharedAccessCookieOptions(env.NODE_ENV === "production"),
  );
  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.redirect(cleanRedirect(request), {
    headers: sharedResponseHeaders,
    status: 303,
  });
  response.cookies.set(SHARED_ACCESS_COOKIE, "", {
    ...sharedAccessCookieOptions(env.NODE_ENV === "production"),
    maxAge: 0,
  });
  return response;
}
