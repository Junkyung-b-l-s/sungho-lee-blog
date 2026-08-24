import Link from "next/link";
import { getAllPosts, getTopics, getYears } from "../lib/posts";
import { formatKoreanDate } from "../lib/date";
import { siteConfig } from "../site.config";

export const metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const posts = getAllPosts();
  const topics = getTopics();
  const years = getYears();
  const recentPosts = posts.slice(0, 5);

  return (
    <>
      <section className="archive-hero shell">
        <p className="eyebrow">{siteConfig.heroEyebrow}</p>
        <h1>{siteConfig.heroTitle}</h1>
        <p className="hero-copy">{siteConfig.heroCopy}</p>
      </section>

      <section className="shell recent-section" aria-labelledby="recent-writing">
        <div className="section-heading">
          <h2 id="recent-writing">최근 기록</h2>
          {posts.length > 5 ? <Link href="/writing">전체 보기</Link> : null}
        </div>

        <div className="record-list">
          {recentPosts.length ? recentPosts.map((post) => (
            <article className="record-row" key={post.slug}>
              <time dateTime={post.publishedAt}>
                {formatKoreanDate(post.publishedAt)}
              </time>
              <div className="record-copy">
                <h3>
                  <Link href={`/writing/${post.slug}`}>{post.title}</Link>
                </h3>
                {post.description ? <p>{post.description}</p> : null}
              </div>
              <span className="record-topic">{post.topic}</span>
              <span className="record-arrow" aria-hidden="true">
                →
              </span>
            </article>
          )) : (
            <p className="empty-archive">첫 기록을 준비하고 있습니다.</p>
          )}
        </div>
      </section>

      <section className="shell index-section" aria-labelledby="archive-index">
        <div className="section-heading">
          <h2 id="archive-index">아카이브</h2>
          <span className="archive-count">기록 {posts.length}개</span>
        </div>

        <div className="archive-links">
          <Link href="/writing">
            <span>연도별 기록</span>
            <strong>{years.length ? years.join(" · ") : "첫 기록을 준비 중입니다"}</strong>
          </Link>
          <Link href="/topics">
            <span>생각의 주제</span>
            <strong>{topics.length ? topics.map((topic) => topic.name).join(" · ") : "아직 등록된 주제가 없습니다"}</strong>
          </Link>
        </div>
      </section>
    </>
  );
}
