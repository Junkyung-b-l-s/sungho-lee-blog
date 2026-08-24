import Link from "next/link";
import { getAllPosts, getYears } from "../../lib/posts";
import { formatKoreanMonthDay } from "../../lib/date";
import { siteConfig } from "../../site.config";

export const metadata = {
  title: "기록",
  description: `${siteConfig.koreanName}의 생각과 기록을 시간순으로 모은 아카이브.`,
  alternates: { canonical: "/writing" },
};

export default function WritingPage() {
  const posts = getAllPosts();
  const years = getYears();

  return (
    <section className="shell archive-page">
      <header className="page-intro compact-intro">
        <p className="eyebrow">CHRONOLOGICAL ARCHIVE</p>
        <h1>기록</h1>
        <p>처음 남긴 모습 그대로 보관하고, 필요한 만큼 다듬어 꺼내 둡니다.</p>
        <span className="page-count">모두 {posts.length}개</span>
      </header>

      <div className="year-groups">
        {!years.length ? <p className="empty-archive">첫 기록을 준비하고 있습니다.</p> : null}
        {years.map((year) => (
          <section className="year-group" key={year} aria-labelledby={`year-${year}`}>
            <h2 id={`year-${year}`}>{year}</h2>
            <div className="year-records">
              {posts
                .filter((post) => post.publishedAt.startsWith(year))
                .map((post) => (
                  <article className="archive-record" key={post.slug}>
                    <time dateTime={post.publishedAt}>
                      {formatKoreanMonthDay(post.publishedAt)}
                    </time>
                    <h3>
                      <Link href={`/writing/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <Link className="topic-link" href={`/topics/${encodeURIComponent(post.topic)}`}>
                      {post.topic}
                    </Link>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
