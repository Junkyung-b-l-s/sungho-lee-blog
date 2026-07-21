import Link from "next/link";
import localFont from "next/font/local";
import SiteHeader from "../components/site-header";
import "./globals.css";

const siteUrl = "https://junkyung.kim";

const sourceHanSerif = localFont({
  src: "./fonts/source-han-serif-kr-subset.woff2",
  weight: "250 900",
  style: "normal",
  variable: "--font-source-han-serif",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Junkyung Kim",
    template: "%s — Junkyung Kim",
  },
  description: "쓰고, 보관하는 김준경 아카이브.",
  authors: [{ name: "Junkyung Kim", url: siteUrl }],
  creator: "Junkyung Kim",
  publisher: "Junkyung Kim",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Junkyung Kim",
    description: "쓰고, 보관하는 김준경 아카이브.",
    url: siteUrl,
    siteName: "Junkyung Kim",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Junkyung Kim",
    description: "쓰고, 보관하는 김준경 아카이브.",
  },
};

export const viewport = {
  themeColor: "#fafafa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={sourceHanSerif.variable}>
      <body>
        <a className="skip-link" href="#content">
          본문으로 건너뛰기
        </a>
        <SiteHeader />
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
