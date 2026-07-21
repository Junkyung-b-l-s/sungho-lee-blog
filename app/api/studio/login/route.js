import { NextResponse } from "next/server";
import {
  createStudioSession,
  passwordMatches,
  STUDIO_COOKIE,
  studioCookieOptions,
} from "../../../../lib/studio-auth";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));

  if (!passwordMatches(password)) {
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    STUDIO_COOKIE,
    createStudioSession(),
    studioCookieOptions(),
  );
  return response;
}
