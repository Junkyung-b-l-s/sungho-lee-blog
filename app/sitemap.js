import { getAllPosts, getTopics } from "../lib/posts";

const siteUrl = "https://junkyung.kim";

export default function sitemap() {
  const staticPages = ["", "/writing", "/topics", "/about"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date("2026-07-20T00:00:00+09:00"),
  }));

  const postPages = getAllPosts().map((post) => ({
    url: `${siteUrl}/writing/${post.slug}`,
    lastModified: new Date(`${post.updatedAt}T00:00:00+09:00`),
  }));

  const topicPages = getTopics().map((topic) => ({
    url: `${siteUrl}/topics/${encodeURIComponent(topic.name)}`,
    lastModified: new Date("2026-07-20T00:00:00+09:00"),
  }));

  return [...staticPages, ...postPages, ...topicPages];
}
