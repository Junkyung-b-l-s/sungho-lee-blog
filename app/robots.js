import { isLocalSite, siteConfig } from "../site.config";

export default function robots() {
  if (isLocalSite()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/api/studio/"],
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
