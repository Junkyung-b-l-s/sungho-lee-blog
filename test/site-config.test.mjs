import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function productionSources(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionSources(relative);
    return /\.(?:js|jsx|mjs|md)$/.test(entry.name) ? [relative] : [];
  });
}

test("Sungho Lee identity is centralized and JK identity is absent from production", async () => {
  const { siteConfig } = await import("../site.config.js");
  assert.equal(siteConfig.name, "Sungho Lee");
  assert.equal(siteConfig.koreanName, "이성호");
  assert.equal(siteConfig.role, "선교사");
  assert.equal(siteConfig.siteUrl, "http://localhost:3100");

  const files = [
    ...productionSources("app"),
    ...productionSources("components"),
    ...productionSources("lib"),
    "next.config.mjs",
    "README.md",
  ];
  const source = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /Junkyung|JK Kim|김준경|junkyung|jk_studio|Junkyung-b-l-s\/junkyung-kim-blog/i);
});

test("favicon uses the Sungho initials and contains no JK identity", () => {
  const icon = fs.readFileSync(path.join(root, "app/icon.svg"), "utf8");
  assert.match(icon, />SH<\/text>/);
  assert.doesNotMatch(icon, />JK<\/text>/);
});

test("local and private-network hosts remain private", async () => {
  const { isPrivateHostname, normalizeSiteUrl } = await import("../site.config.js");
  assert.equal(normalizeSiteUrl("https://example.com/"), "https://example.com");
  assert.equal(normalizeSiteUrl("https://example.com/archive/"), "https://example.com/archive");
  assert.throws(() => normalizeSiteUrl("not a url"), /NEXT_PUBLIC_SITE_URL/);
  for (const hostname of ["localhost", "127.0.0.1", "127.4.3.2", "::1", "10.0.0.8", "172.20.1.2", "192.168.1.5", "preview.local"]) {
    assert.equal(isPrivateHostname(hostname), true, hostname);
  }
  assert.equal(isPrivateHostname("example.com"), false);
  assert.equal(isPrivateHostname("fcorp.com"), false);
  assert.equal(isPrivateHostname("127.999.999.999"), false);
});

test("local scripts bind only to the loopback interface", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const nextConfig = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
  assert.match(packageJson.scripts.dev, /-H 127\.0\.0\.1/);
  assert.match(packageJson.scripts.start, /-H 127\.0\.0\.1/);
  assert.match(nextConfig, /www\.musalee\.blog/);
  assert.match(nextConfig, /https:\/\/musalee\.blog\/\:path\*/);
});
