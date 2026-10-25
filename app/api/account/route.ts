import { NextRequest, NextResponse } from "next/server";
import { AccountError, accounts, SESSION_SECONDS } from "@/lib/server/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "toyogo-session";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function failure(error: unknown) {
  if (error instanceof AccountError) return reply({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return reply({ error: "Invalid request data." }, 400);
  console.error("Account storage failed:", error);
  return reply({ error: "Could not access saved accounts. Please try again." }, 500);
}

export async function GET(request: NextRequest) {
  try {
    return reply({ account: await accounts.session(request.cookies.get(COOKIE)?.value) });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const previous = request.cookies.get(COOKIE)?.value;
    const result = body.action === "login"
      ? await accounts.login(body.email, body.password, previous)
      : body.action === "signup"
        ? await accounts.signup(body.email, body.username, body.password, body.trip, previous)
        : null;
    if (!result) return reply({ error: "Unknown account action." }, 400);
    const response = reply({ account: result.account });
    response.cookies.set(COOKIE, result.token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) { return failure(error); }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const account = await accounts.update(request.cookies.get(COOKIE)?.value, body.email, body.username, body.password, body.trip);
    return reply({ account });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    await accounts.logout(request.cookies.get(COOKIE)?.value);
    const response = reply({ account: null });
    response.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return failure(error); }
}
