import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Junkyung Kim — 생각과 마음";
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
        JK Kim
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 80, fontWeight: 800, letterSpacing: "-0.05em" }}>
          생각과 마음
        </div>
        <div style={{ fontSize: 30, fontWeight: 400, color: "#68717a" }}>
          지금의 생각과 감각을 다시 만날 수 있도록 적어둡니다.
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
        <span>PERSONAL ARCHIVE</span>
        <span>junkyung.kim</span>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Source Han Serif", data: font, weight: 400 }],
    },
  );
}
