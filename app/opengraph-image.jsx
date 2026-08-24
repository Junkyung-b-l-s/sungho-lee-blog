import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig, siteHost } from "../site.config";

export const alt = `${siteConfig.name} — ${siteConfig.heroTitle}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const font = await readFile(
    path.join(process.cwd(), "app/fonts/source-han-serif-kr-og.otf"),
  );

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 84px",
        background: "#fafafa",
        color: "#15191d",
        fontFamily: "Source Han Serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 31,
          fontWeight: 800,
          color: "#163f63",
        }}
      >
        {siteConfig.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: "-0.05em" }}>
          {siteConfig.heroTitle}
        </div>
        <div style={{ fontSize: 30, fontWeight: 400, color: "#68717a" }}>
          {siteConfig.heroCopy}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
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
