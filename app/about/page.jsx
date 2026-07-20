export const metadata = {
  title: "이곳에 관하여",
  description: "김준경의 개인 아카이브에 관하여.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Junkyung Kim",
    alternateName: "JK Kim",
    url: "https://junkyung.kim",
  };

  return (
    <section className="shell about-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <p className="eyebrow">ABOUT THIS ARCHIVE</p>
      <h1>이곳에 관하여</h1>
      <div className="about-copy">
        <p>
          이곳은 생각을 쓰고, 보관하고, 다시 만나기 위해 만든 김준경의 개인
          아카이브입니다.
        </p>
        <p>
          완성된 생각만 남기기보다 그때의 문장과 감각을 가능한 한 그대로
          보존합니다. 글을 다듬더라도 최초의 원문은 지우지 않습니다.
        </p>
        <p>
          시간이 흐른 뒤 다시 읽었을 때 달라진 생각까지 함께 쌓이는 공간을
          만들고 있습니다.
        </p>
      </div>
    </section>
  );
}
