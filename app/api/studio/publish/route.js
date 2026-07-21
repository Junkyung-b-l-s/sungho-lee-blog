import { cookies } from "next/headers";
import matter from "gray-matter";
import { NextResponse } from "next/server";
import { STUDIO_COOKIE, verifyStudioSession } from "../../../../lib/studio-auth";
import {
  assertSlugAvailable,
  publishFiles,
} from "../../../../lib/studio-github";

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "").slice(0, 60);
}

export async function POST(request) {
  const cookieStore = await cookies();
  if (!verifyStudioSession(cookieStore.get(STUDIO_COOKIE)?.value)) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const data = await request.json().catch(() => ({}));
  const title = data.title?.trim();
  const original = data.original?.trim();
  const revised = data.revised?.trim();
  const subtitle = data.subtitle?.trim();
  const topic = data.topic?.trim();
  const slug = data.slug?.trim();
  const publishedAt = data.publishedAt?.trim();

  if (![title, original, revised, subtitle, topic, slug, publishedAt].every(Boolean)) {
    return NextResponse.json({ error: "발행 정보를 모두 채워 주세요." }, { status: 400 });
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: "슬러그는 영문 소문자와 하이픈만 사용할 수 있습니다." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    return NextResponse.json({ error: "발행일 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (title.length > 100 || original.length > 30000 || revised.length > 30000) {
    return NextResponse.json(
      { error: "제목은 100자, 원문과 승인본은 각각 30,000자 이하여야 합니다." },
      { status: 400 },
    );
  }
  if (!revised.includes(subtitle)) {
    return NextResponse.json(
      { error: "핵심 문장은 승인본에 실제로 존재하는 문장이어야 합니다." },
      { status: 400 },
    );
  }

  const filename = `${publishedAt.replaceAll("-", "")}_${safeFilename(title)}.md`;
  const originalPath = `content/originals/${filename}`;
  const publishedPath = `content/published/${filename}`;
  const originalContent = `${original}\n`;
  const publishedContent = matter.stringify(`${revised}\n`, {
    title,
    slug,
    subtitle,
    publishedAt,
    updatedAt: publishedAt,
    topic,
    type: "essay",
    visibility: "public",
    original: `../originals/${filename}`,
  });

  try {
    await assertSlugAvailable(slug);
    const commit = await publishFiles({
      title,
      files: [
        { path: originalPath, content: originalContent },
        { path: publishedPath, content: publishedContent },
      ],
    });

    return NextResponse.json({
      ok: true,
      ...commit,
      publicUrl: `https://junkyung.kim/writing/${slug}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "발행하지 못했습니다." },
      { status: 502 },
    );
  }
}
