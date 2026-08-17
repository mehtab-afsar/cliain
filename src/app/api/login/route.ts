import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifyPassword,
} from "@/lib/session";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  let isValid: boolean;
  try {
    isValid = verifyPassword(password);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login is not configured.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!isValid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
