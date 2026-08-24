import test from "node:test";
import assert from "node:assert/strict";
import {
  githubBlobPayload,
  publishFiles,
  requiredFileAction,
} from "../lib/studio-github.js";

test("GitHub blobs preserve explicit base64 image encoding", () => {
  assert.deepEqual(
    githubBlobPayload({ content: "UklGRgAAAABXRUJQ", encoding: "base64" }),
    { content: "UklGRgAAAABXRUJQ", encoding: "base64" },
  );
  assert.deepEqual(githubBlobPayload({ content: "본문" }), {
    content: "본문",
    encoding: "utf-8",
  });
});

test("per-file create action overrides an update publication", () => {
  assert.equal(requiredFileAction({ action: "create" }, "update"), "create");
  assert.equal(requiredFileAction({ action: "upsert" }, "update"), "upsert");
  assert.equal(requiredFileAction({}, "update"), "update");
  assert.throws(() => requiredFileAction({ action: "delete" }, "update"), /동작/);
});

test("publishing cannot fall back to another repository", async () => {
  const previousToken = process.env.GITHUB_CONTENT_TOKEN;
  const previousRepository = process.env.GITHUB_CONTENT_REPOSITORY;
  process.env.GITHUB_CONTENT_TOKEN = "test-token-not-a-secret";
  delete process.env.GITHUB_CONTENT_REPOSITORY;
  try {
    await assert.rejects(
      publishFiles({ title: "테스트", files: [] }),
      /GITHUB_CONTENT_REPOSITORY가 설정되지 않았습니다/,
    );
  } finally {
    if (previousToken === undefined) delete process.env.GITHUB_CONTENT_TOKEN;
    else process.env.GITHUB_CONTENT_TOKEN = previousToken;
    if (previousRepository === undefined) delete process.env.GITHUB_CONTENT_REPOSITORY;
    else process.env.GITHUB_CONTENT_REPOSITORY = previousRepository;
  }
});
