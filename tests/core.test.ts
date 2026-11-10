import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatHHmm,
  computeStartTime,
  formatPomodoroBlock,
  parseLastBlockEnd,
  parsePomodoroBlocks,
  aggregateStats,
} from "../src/core";

test("formatHHmm: 9:05 -> 09:05", () => {
  const d = new Date(2026, 10, 10, 9, 5);
  assert.equal(formatHHmm(d), "09:05");
});

test("computeStartTime: без прошлого блока — фактическое начало", () => {
  const start = new Date(2026, 10, 10, 9, 30);
  assert.equal(computeStartTime(start, null).getTime(), start.getTime());
});

test("computeStartTime: не раньше конца последнего блока (R6)", () => {
  const start = new Date(2026, 10, 10, 9, 0);
  const lastEnd = new Date(2026, 10, 10, 9, 15);
  assert.equal(computeStartTime(start, lastEnd).getTime(), lastEnd.getTime());
});

test("computeStartTime: фактическое начало позже последнего блока — без изменений", () => {
  const start = new Date(2026, 10, 10, 10, 30);
  const lastEnd = new Date(2026, 10, 10, 9, 40);
  assert.equal(computeStartTime(start, lastEnd).getTime(), start.getTime());
});

test("formatPomodoroBlock: корректный markdown", () => {
  const start = new Date(2026, 10, 10, 9, 30);
  const end = new Date(2026, 10, 10, 10, 0);
  const block = formatPomodoroBlock(start, end, ["сделал задачу", "артефакт: [[заметка]]"]);
  assert.ok(block.includes("## 🍅 09:30 — 10:00"));
  assert.ok(block.includes("- сделал задачу"));
  assert.ok(block.includes("- артефакт: [[заметка]]"));
});

test("parseLastBlockEnd: возвращает конец последнего блока или null", () => {
  const content = "## Лента дня\n\n## 🍅 09:00 — 09:30\n\n- a\n\n## 🍅 10:00 — 10:30\n\n- b\n";
  assert.equal(parseLastBlockEnd(content), "10:30");
  assert.equal(parseLastBlockEnd("## Лента дня\n"), null);
});

test("parsePomodoroBlocks: собирает все блоки", () => {
  const content = "## 🍅 09:00 — 09:30\n- a\n## 🍅 10:00 — 10:30\n- b\n";
  const blocks = parsePomodoroBlocks(content);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].start, "09:00");
  assert.equal(blocks[1].end, "10:30");
});

test("aggregateStats: считает количество и минуты по дням", () => {
  const days = [
    { day: "2026-11-10", content: "## 🍅 09:00 — 09:30\n- a\n## 🍅 10:00 — 10:30\n- b\n" },
    { day: "2026-11-11", content: "## 🍅 09:00 — 10:00\n- c\n" },
  ];
  const stats = aggregateStats(days);
  assert.equal(stats.length, 2);
  assert.equal(stats[0].day, "2026-11-10");
  assert.equal(stats[0].count, 2);
  assert.equal(stats[0].minutes, 60);
  assert.equal(stats[1].count, 1);
  assert.equal(stats[1].minutes, 60);
});