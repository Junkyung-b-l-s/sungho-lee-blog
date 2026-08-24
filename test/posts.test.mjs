import test from "node:test";
import assert from "node:assert/strict";
import { getAllPosts, getPost, getTopics, getYears } from "../lib/posts.js";

test("archive helpers remain stable before and after the first post", () => {
  assert.ok(Array.isArray(getAllPosts()));
  assert.ok(Array.isArray(getYears()));
  assert.ok(Array.isArray(getTopics()));
  assert.equal(getPost("definitely-not-a-real-slug"), null);
});
