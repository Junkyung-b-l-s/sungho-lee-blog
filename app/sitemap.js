import { getAllPosts, getTopics } from "../lib/posts";
import { siteConfig } from "../site.config";

export default function sitemap() {
  const staticPages = ["", "/writing", "/topics", "/about"].map((pathname) => ({
    url: `${siteConfig.siteUrl}${pathname}`,
    lastModified: new Date(),
  }));
  const postPages = getAllPosts().map((post) => ({
    url: `${siteConfig.siteUrl}/writing/${post.slug}`,
    lastModified: new Date(`${post.updatedAt}T00:00:00+09:00`),
  }));
  const topicPages = getTopics().map((topic) => ({
    url: `${siteConfig.siteUrl}/topics/${encodeURIComponent(topic.name)}`,
    lastModified: new Date(),
  }));
  return [...staticPages, ...postPages, ...topicPages];
}
