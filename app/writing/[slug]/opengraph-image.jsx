import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getPost } from "../../../lib/posts";
import { siteConfig, siteHost } from "../../../site.config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  const font = await readFile(
    path.join(process.cwd(), "app/fonts/source-han-serif-kr-og.otf"),
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#fafafa",
        color: "#15191d",
        fontFamily: "Source Han Serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "absolute",
          top: 62,
          left: 84,
          right: 84,
          fontSize: 25,
          color: "#163f63",
        }}
      >
        <span style={{ fontSize: 31, fontWeight: 800 }}>{siteConfig.name}</span>
        <span>{post?.topic ?? "기록"}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "absolute",
          top: 190,
          left: 84,
          right: 84,
          gap: 21,
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.22,
            letterSpacing: "-0.05em",
          }}
        >
          {post?.title ?? siteConfig.name}
        </div>
        {post?.description ? (
          <div
            style={{
              maxWidth: 990,
              fontSize: 28,
              lineHeight: 1.55,
              color: "#68717a",
            }}
          >
            {post.description}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          position: "absolute",
          left: 84,
          right: 84,
          bottom: 62,
          paddingTop: 25,
          borderTop: "2px solid #dadde0",
          fontSize: 23,
          color: "#68717a",
        }}
      >
        <span>{siteConfig.heroEyebrow}</span>
        <span>{siteHost()}</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Source Han Serif", data: font, weight: 400 }],
    },
  );
}
