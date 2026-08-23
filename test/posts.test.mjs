import test from "node:test";
import assert from "node:assert/strict";
import { getPost } from "../lib/posts.js";

test("published prose preserves intentional single line breaks", () => {
  const post = getPost("rejected-again");

  assert.ok(post);
  assert.match(
    post.html,
    /나은: 엄마, 엄마는 내 거야\. 도하야, 아빠는 너 줄게\.<br>\s*도하: 싫어\.<br>\s*나: \?/
  );
});
