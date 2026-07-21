import Link from "next/link";
import { getTopics } from "../../lib/posts";

export const metadata = {
  title: "주제",
  description: "김준경의 기록을 생각의 갈래에 따라 살펴봅니다.",
  alternates: { canonical: "/topics" },
};

export default function TopicsPage() {
  const topics = getTopics();

  return (
    <section className="shell topics-page">
      <header className="page-intro compact-intro">
        <p className="eyebrow">THREADS OF THOUGHT</p>
        <h1>주제</h1>
        <p>시간을 두고 되풀이해 생각하게 되는 것들의 갈래입니다.</p>
      </header>

      <div className="topic-grid">
        {topics.map((topic, index) => (
          <Link
            className="topic-card"
            href={`/topics/${encodeURIComponent(topic.name)}`}
            key={topic.name}
          >
            <span className="topic-index">{String(index + 1).padStart(2, "0")}</span>
            <h2>{topic.name}</h2>
            <span className="topic-count">글 {topic.count}개</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
