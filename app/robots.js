export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/api/studio/"],
    },
    sitemap: "https://junkyung.kim/sitemap.xml",
  };
}
