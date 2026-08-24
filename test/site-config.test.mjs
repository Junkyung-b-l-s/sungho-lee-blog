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
  assert.equal(siteConfig.siteUrl, "http://localhost:3000");

  const files = [
    ...productionSources("app"),
    ...productionSources("components"),
    ...productionSources("lib"),
    "next.config.mjs",
    "README.md",
  ];
  const source = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /Junkyung|JK Kim|김준경|junkyung\.kim|Junkyung-b-l-s\/junkyung-kim-blog/);
});
