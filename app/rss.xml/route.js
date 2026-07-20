import { getAllPosts } from "../../lib/posts";

const siteUrl = "https://junkyung.kim";

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const items = getAllPosts()
    .map(
      (post) => `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${siteUrl}/writing/${post.slug}</link>
          <guid>${siteUrl}/writing/${post.slug}</guid>
          <description>${escapeXml(post.description)}</description>
          <pubDate>${new Date(`${post.publishedAt}T00:00:00+09:00`).toUTCString()}</pubDate>
        </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>Junkyung Kim</title>
        <link>${siteUrl}</link>
        <description>김준경의 글과 기록.</description>
        <language>ko</language>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
