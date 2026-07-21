import { NextResponse } from "next/server";
import { STUDIO_COOKIE, studioCookieOptions } from "../../../../lib/studio-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STUDIO_COOKIE, "", {
    ...studioCookieOptions(),
    maxAge: 0,
  });
  return response;
}
