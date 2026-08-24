import { siteConfig } from "../../site.config";

export const metadata = {
  title: "이곳에 관하여",
  description: `${siteConfig.koreanName} ${siteConfig.role}의 개인 아카이브에 관하여.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.name,
    alternateName: siteConfig.koreanName,
    jobTitle: siteConfig.role,
    url: siteConfig.siteUrl,
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
          이곳은 {siteConfig.koreanName} {siteConfig.role}의 글과 기록을 담는 개인
          아카이브입니다.
        </p>
        <p>
          선교의 자리에서 만난 말씀과 사람, 삶의 생각을 기록하고 오래 보관합니다.
        </p>
        <p>
          완성된 글뿐 아니라 처음 쓴 문장도 함께 남겨, 시간이 흐른 뒤 다시 만날 수
          있도록 합니다.
        </p>
      </div>
    </section>
  );
}
