"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SiteHeader() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const updateHeader = () => setIsCompact(window.scrollY > 24);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  return (
    <header className={`site-header${isCompact ? " is-compact" : ""}`}>
      <div className="shell header-inner">
        <Link className="wordmark" href="/" aria-label="김준경 홈">
          JK Kim
        </Link>
        <nav aria-label="주요 메뉴">
          <Link href="/writing">기록</Link>
          <Link href="/topics">주제</Link>
        </nav>
      </div>
    </header>
  );
}
