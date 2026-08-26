import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STUDIO_COOKIE, verifyStudioSession } from "../../../../lib/studio-auth";
import { buildStudioPostFiles } from "../../../../lib/studio-content";
import { siteConfig } from "../../../../site.config";
import {
  assertSlugAvailable,
  publishFiles,
  updateFiles,
} from "../../../../lib/studio-github";

function todayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
  try {
    const postFiles = buildStudioPostFiles({
      ...data,
      title,
      original,
      revised,
      subtitle,
      topic,
      slug,
      publishedAt,
      updatedAt: data.sourcePublishedPath ? todayInSeoul() : publishedAt,
    });
    await assertSlugAvailable(
      slug,
      postFiles.editing ? postFiles.publishedPath : "",
    );
    const save = postFiles.editing ? updateFiles : publishFiles;
    const commit = await save({
      title,
      files: postFiles.files,
    });

    return NextResponse.json({
      ok: true,
      editing: postFiles.editing,
      ...commit,
      publicUrl: `${siteConfig.siteUrl}/writing/${slug}`,
    });
  } catch (error) {
    const staleEditSource = Boolean(data.sourcePublishedPath) &&
      /파일을 찾지 못했습니다/.test(error.message || "");
    return NextResponse.json(
      {
        error: staleEditSource
          ? "삭제된 글의 수정 연결을 해제했습니다. 발행일과 내용을 확인한 뒤 새 글로 다시 발행해 주세요."
          : error.message || "발행하지 못했습니다.",
        code: staleEditSource ? "STALE_EDIT_SOURCE" : undefined,
      },
      { status: staleEditSource ? 409 : 502 },
    );
  }
}
