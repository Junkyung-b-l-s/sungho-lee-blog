import test from "node:test";
import assert from "node:assert/strict";
import { formatKoreanDate, formatKoreanMonthDay } from "../lib/date.js";

test("KST publication date stays on the same calendar day in a UTC runtime", () => {
  assert.equal(formatKoreanDate("2026-07-22"), "2026년 7월 22일");
});

test("KST archive month and day stay on the same calendar day in a UTC runtime", () => {
  assert.equal(formatKoreanMonthDay("2026-07-22"), "7월 22일");
});
