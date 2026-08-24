import Link from "next/link";
import localFont from "next/font/local";
import SiteHeader from "../components/site-header";
import { siteConfig } from "../site.config";
import "./globals.css";

const sourceHanSerif = localFont({
  src: "./fonts/source-han-serif-kr-subset.woff2",
  weight: "250 900",
  style: "normal",
  variable: "--font-source-han-serif",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.archiveDescription,
  authors: [{ name: siteConfig.name, url: siteConfig.siteUrl }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.archiveDescription,
    url: siteConfig.siteUrl,
    siteName: siteConfig.name,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.archiveDescription,
  },
};

export const viewport = {
  themeColor: "#fafafa",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={sourceHanSerif.variable}>
      <body>
        <a className="skip-link" href="#content">본문으로 건너뛰기</a>
        <SiteHeader />
        <main id="content">{children}</main>
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <strong>{siteConfig.name}</strong>
              <span>{siteConfig.koreanName} {siteConfig.role}의 개인 아카이브</span>
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
