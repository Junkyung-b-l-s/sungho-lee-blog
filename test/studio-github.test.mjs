import test from "node:test";
import assert from "node:assert/strict";
import {
  githubBlobPayload,
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
