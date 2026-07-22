import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostsByTopic, getTopics } from "../../../lib/posts";
import { formatKoreanDate } from "../../../lib/date";

export function generateStaticParams() {
  return getTopics().map((topic) => ({ topic: topic.name }));
}

export async function generateMetadata({ params }) {
  const { topic } = await params;
  const decodedTopic = decodeURIComponent(topic);

  return {
    title: decodedTopic,
    description: `${decodedTopic}에 관한 김준경의 기록.`,
    alternates: { canonical: `/topics/${encodeURIComponent(decodedTopic)}` },
  };
}

export default async function TopicPage({ params }) {
  const { topic } = await params;
  const decodedTopic = decodeURIComponent(topic);
  const posts = getPostsByTopic(decodedTopic);

  if (posts.length === 0) notFound();

  return (
    <section className="shell archive-page">
      <header className="page-intro compact-intro">
        <p className="eyebrow">TOPIC</p>
        <h1>{decodedTopic}</h1>
        <p>이 주제를 지나며 남긴 생각을 모았습니다.</p>
        <span className="page-count">기록 {posts.length}개</span>
      </header>

      <div className="record-list">
        {posts.map((post) => (
          <article className="record-row" key={post.slug}>
            <time dateTime={post.publishedAt}>
              {formatKoreanDate(post.publishedAt)}
            </time>
            <div className="record-copy">
              <h2>
                <Link href={`/writing/${post.slug}`}>{post.title}</Link>
              </h2>
              {post.description ? <p>{post.description}</p> : null}
            </div>
            <span className="record-arrow" aria-hidden="true">→</span>
          </article>
        ))}
      </div>
    </section>
  );
}
