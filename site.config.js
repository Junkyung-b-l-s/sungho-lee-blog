const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteConfig = Object.freeze({
  name: "Sungho Lee",
  koreanName: "이성호",
  alternateName: "이성호",
  wordmark: "Sungho Lee",
  role: "선교사",
  siteUrl: configuredUrl || "http://localhost:3000",
  description: "이성호 선교사의 글과 기록.",
  archiveDescription: "말씀과 삶, 선교의 자리에서 만난 생각을 기록하는 개인 아카이브.",
  heroEyebrow: "MISSIONARY ARCHIVE",
  heroTitle: "말씀과 삶",
  heroCopy: "선교의 자리에서 만난 말씀과 사람, 삶의 기록을 남깁니다.",
});

export function siteHost() {
  return new URL(siteConfig.siteUrl).host;
}

export function isLocalSite() {
  return new URL(siteConfig.siteUrl).hostname === "localhost";
}
