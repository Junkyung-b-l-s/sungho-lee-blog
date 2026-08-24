import { getAllPosts } from "../../lib/posts";
import { siteConfig } from "../../site.config";

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
    .map((post) => `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>${siteConfig.siteUrl}/writing/${post.slug}</link>
        <guid>${siteConfig.siteUrl}/writing/${post.slug}</guid>
        ${post.description ? `<description>${escapeXml(post.description)}</description>` : ""}
        <pubDate>${new Date(`${post.publishedAt}T00:00:00+09:00`).toUTCString()}</pubDate>
      </item>`)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <rss version="2.0">
      <channel>
        <title>${escapeXml(siteConfig.name)}</title>
        <link>${siteConfig.siteUrl}</link>
        <description>${escapeXml(siteConfig.description)}</description>
        <language>ko</language>
        ${items}
      </channel>
    </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
