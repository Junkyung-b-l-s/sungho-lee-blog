import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const publishedDirectory = path.join(process.cwd(), "content", "published");

function readingTime(markdown) {
  const characters = markdown.replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(characters / 500));
}

function loadPost(filename) {
  const source = fs.readFileSync(path.join(publishedDirectory, filename), "utf8");
  const { data, content } = matter(source);

  return {
    ...data,
    description: data.subtitle?.trim() ?? "",
    filename,
    body: content.trim(),
    readingTime: readingTime(content),
  };
}

export function getAllPosts() {
  return fs
    .readdirSync(publishedDirectory)
    .filter((filename) => filename.endsWith(".md"))
    .map(loadPost)
    .filter((post) => post.visibility === "public")
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPost(slug) {
  const post = getAllPosts().find((candidate) => candidate.slug === slug);

  if (!post) return null;

  return {
    ...post,
    html: marked.parse(post.body),
  };
}

export function getYears() {
  return [...new Set(getAllPosts().map((post) => post.publishedAt.slice(0, 4)))];
}

export function getTopics() {
  const counts = new Map();

  for (const post of getAllPosts()) {
    counts.set(post.topic, (counts.get(post.topic) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function getPostsByTopic(topic) {
  return getAllPosts().filter((post) => post.topic === topic);
}
