import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { STUDIO_COOKIE, verifyStudioSession } from "../../../../lib/studio-auth";
import { getAllPosts } from "../../../../lib/posts";
import { isSafeStudioContentPath } from "../../../../lib/studio-content";

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyStudioSession(cookieStore.get(STUDIO_COOKIE)?.value)) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const posts = getAllPosts().map((post) => {
      const sourcePublishedPath = `content/published/${post.filename}`;
      const originalFilename = path.basename(String(post.original || ""));
      const sourceOriginalPath = `content/originals/${originalFilename}`;

      if (
        !isSafeStudioContentPath(sourcePublishedPath, "published") ||
        !isSafeStudioContentPath(sourceOriginalPath, "originals")
      ) {
        throw new Error(`${post.filename}의 원문 경로가 올바르지 않습니다.`);
      }

      return {
        title: post.title,
        original: fs
          .readFileSync(path.join(process.cwd(), sourceOriginalPath), "utf8")
          .trim(),
        revised: post.body,
        subtitle: post.subtitle || "",
        topic: post.topic || "",
        slug: post.slug,
        publishedAt: post.publishedAt,
        sourceOriginalPath,
        sourcePublishedPath,
      };
    });

    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "발행 글을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
