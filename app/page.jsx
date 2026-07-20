import Link from "next/link";
import { getAllPosts, getTopics, getYears } from "../lib/posts";

export const metadata = {
  alternates: { canonical: "/" },
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function HomePage() {
  const posts = getAllPosts();
  const topics = getTopics();
  const years = getYears();
  const recentPosts = posts.slice(0, 5);

  return (
    <>
      <section className="archive-hero shell">
        <p className="eyebrow">JUNKYUNG KIM · PERSONAL ARCHIVE</p>
        <h1>
          생각을 쓰고,
          <br />
          오래 보관합니다.
        </h1>
        <p className="hero-copy">
          지금의 문장과 감각을 잃지 않도록 남겨둡니다. 나중의 제가 다시
          찾아와 읽고 싶은 공간입니다.
        </p>
      </section>

      <section className="shell recent-section" aria-labelledby="recent-writing">
        <div className="section-heading">
          <h2 id="recent-writing">최근 기록</h2>
          {posts.length > 5 ? <Link href="/writing">전체 보기</Link> : null}
        </div>

        <div className="record-list">
          {recentPosts.map((post) => (
            <article className="record-row" key={post.slug}>
              <time dateTime={post.publishedAt}>
                {dateFormatter.format(new Date(`${post.publishedAt}T00:00:00+09:00`))}
              </time>
              <div className="record-copy">
                <h3>
                  <Link href={`/writing/${post.slug}`}>{post.title}</Link>
                </h3>
                <p>{post.description}</p>
              </div>
              <span className="record-topic">{post.topic}</span>
              <span className="record-arrow" aria-hidden="true">
                →
              </span>
            </article>
          ))}
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
            <strong>{years.join(" · ")}</strong>
          </Link>
          <Link href="/topics">
            <span>생각의 주제</span>
            <strong>{topics.map((topic) => topic.name).join(" · ")}</strong>
          </Link>
        </div>
      </section>
    </>
  );
}
