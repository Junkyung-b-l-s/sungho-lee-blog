import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

const siteUrl = "https://junkyung.kim";

const chosunMyungjo = localFont({
  src: "../node_modules/@noonnu/chosunilbo-myungjo/fonts/chosunilbomyungjo-normal.woff",
  weight: "400",
  style: "normal",
  variable: "--font-chosun-myungjo",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Junkyung Kim",
    template: "%s — Junkyung Kim",
  },
  description: "쓰고, 보관하고, 다시 읽는 김준경의 개인 아카이브.",
  openGraph: {
    title: "Junkyung Kim",
    description: "쓰고, 보관하고, 다시 읽는 김준경의 개인 아카이브.",
    url: siteUrl,
    siteName: "Junkyung Kim",
    locale: "ko_KR",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#f3f0e8",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={chosunMyungjo.variable}>
      <body>
        <a className="skip-link" href="#content">
          본문으로 건너뛰기
        </a>
        <header className="site-header">
          <div className="shell header-inner">
            <Link className="wordmark" href="/" aria-label="Junkyung Kim 홈">
              JUNKYUNG KIM
            </Link>
            <nav aria-label="주요 메뉴">
              <Link href="/writing">기록</Link>
              <Link href="/topics">주제</Link>
            </nav>
          </div>
        </header>
        <main id="content">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <strong>Junkyung Kim</strong>
              <span>생각과 기록의 개인 아카이브</span>
            </div>
            <div className="footer-links">
              <Link href="/about">이곳에 관하여</Link>
              <a href="/rss.xml">RSS</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
