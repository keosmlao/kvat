import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

// Wipes the session cookie and redirects. Used when a Server Component detects
// a stale session (e.g. tenant DB no longer exists) — Server Components can't
// write cookies, so they redirect here instead.
export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/login";
  await destroySession();
  return NextResponse.redirect(new URL(returnTo, req.url));
}
