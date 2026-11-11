import { test } from "node:test";
import assert from "node:assert/strict";
import { Snoozer } from "../src/snoozer";

function makeSnoozer() {
  const calls = { wake: 0, tick: 0 };
  const s = new Snoozer({
    onWake: () => calls.wake++,
    onTick: () => calls.tick++,
  });
  return { s, calls };
}

// Переводит будильник в прошлое, чтобы ближайший тик (500 мс) его разбудил.
function forceExpire(s: Snoozer) {
  (s as unknown as { until: number }).until = Date.now() - 1;
}

test("start: активна, остаток около заданных минут", () => {
  const { s } = makeSnoozer();
  s.start(10);
  assert.ok(s.active);
  const rem = s.remainingMs;
  assert.ok(rem > 9 * 60_000 && rem <= 10 * 60_000, `остаток ${rem}`);
  assert.equal(s.formatRemaining(), "10:00");
  s.cancel();
});

test("истечение: onWake ровно один раз, после — неактивна", async () => {
  const { s, calls } = makeSnoozer();
  s.start(10);
  forceExpire(s);
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(calls.wake, 1);
  assert.ok(!s.active);
  assert.equal(s.remainingMs, 0);
});

test("cancel досрочно: неактивна, onWake не вызывается", async () => {
  const { s, calls } = makeSnoozer();
  s.start(10);
  s.cancel();
  assert.ok(!s.active);
  await new Promise((r) => setTimeout(r, 700));
  assert.equal(calls.wake, 0);
});

test("повторный start перезапускает отсчёт", () => {
  const { s } = makeSnoozer();
  s.start(10);
  s.start(1);
  const rem = s.remainingMs;
  assert.ok(rem > 0 && rem <= 60_000, `остаток ${rem}`);
  s.cancel();
});
