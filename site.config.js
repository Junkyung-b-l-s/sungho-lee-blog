export function normalizeSiteUrl(value) {
  try {
    return new URL(value || "http://localhost:3100").toString().replace(/\/+$/, "");
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.");
  }
}

const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const siteConfig = Object.freeze({
  name: "Sungho Lee",
  koreanName: "이성호",
  alternateName: "이성호",
  wordmark: "Sungho Lee",
  role: "선교사",
  siteUrl: normalizeSiteUrl(configuredUrl),
  description: "이성호 선교사의 글과 기록.",
  archiveDescription: "말씀과 삶, 선교의 자리에서 만난 생각을 기록하는 개인 아카이브.",
  heroEyebrow: "MISSIONARY ARCHIVE",
  heroTitle: "말씀과 삶",
  heroCopy: "선교의 자리에서 만난 말씀과 사람, 삶의 기록을 남깁니다.",
});

export function siteHost() {
  return new URL(siteConfig.siteUrl).host;
}

export function isPrivateHostname(value) {
  const hostname = String(value || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname === "::1" || hostname.endsWith(".local")) return true;
  if (hostname.includes(":")) {
    return hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:");
  }
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return false;
  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 169 && octets[1] === 254);
}

export function isLocalSite() {
  return isPrivateHostname(new URL(siteConfig.siteUrl).hostname);
}
