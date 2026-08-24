import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost } from "../../../lib/posts";
import { formatKoreanDate } from "../../../lib/date";
import { siteConfig } from "../../../site.config";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/writing/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/writing/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [siteConfig.name],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: "ko-KR",
    author: {
      "@type": "Person",
      name: siteConfig.name,
      url: `${siteConfig.siteUrl}/about`,
    },
    mainEntityOfPage: `${siteConfig.siteUrl}/writing/${post.slug}`,
  };

  return (
    <article className="shell article-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Link className="back-link" href="/writing">← 모든 기록</Link>

      <header className="article-header">
        <div className="article-kicker">
          <Link href={`/topics/${encodeURIComponent(post.topic)}`}>{post.topic}</Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt}>
            {formatKoreanDate(post.publishedAt)}
          </time>
        </div>
        <h1>{post.title}</h1>
        {post.description ? (
          <p className="article-description">{post.description}</p>
        ) : null}
      </header>

      <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />

      <footer className="article-footer">
        <div>
          <span>처음 기록한 날</span>
          <strong>{formatKoreanDate(post.publishedAt)}</strong>
        </div>
        <Link href="/writing">아카이브로 돌아가기 →</Link>
      </footer>
    </article>
  );
}
