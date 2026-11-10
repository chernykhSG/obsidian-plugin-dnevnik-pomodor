import { test } from "node:test";
import assert from "node:assert/strict";
import { PomodoroTimer } from "../src/timer";

function makeTimer() {
  const calls = { work: 0, break: 0, tick: 0 };
  const timer = new PomodoroTimer({
    onWorkFinished: () => calls.work++,
    onBreakFinished: () => calls.break++,
    onTick: () => calls.tick++,
  });
  return { timer, calls };
}

// Гоняет один тик так, будто интервал давно истёк, и вызывает finish().
function forceFinish(timer: PomodoroTimer) {
  const t = timer as unknown as {
    state: string;
    segmentStart: number;
    segmentRemainingMs: number;
    tick: () => void;
  };
  t.state = "running";
  t.segmentStart = Date.now() - 10_000;
  t.segmentRemainingMs = 1;
  t.tick();
}

test("конец перерыва: вызывается onBreakFinished, режим возвращается к работе", () => {
  const { timer, calls } = makeTimer();
  timer.mode = "break";
  forceFinish(timer);
  assert.equal(calls.break, 1);
  assert.equal(calls.work, 0);
  assert.equal(timer.mode, "work");
  assert.equal(timer.state, "stopped");
});

test("конец работы: вызывается onWorkFinished, onBreakFinished — нет", () => {
  const { timer, calls } = makeTimer();
  timer.mode = "work";
  forceFinish(timer);
  assert.equal(calls.work, 1);
  assert.equal(calls.break, 0);
  assert.equal(timer.mode, "break");
  assert.equal(timer.state, "stopped");
});
