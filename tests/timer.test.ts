import { test } from "node:test";
import assert from "node:assert/strict";
import { PomodoroTimer, shouldAutoBreak } from "../src/timer";

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

test("стоп в перерыве: отмена перерыва, возврат к работе с полной длительностью", () => {
  const { timer } = makeTimer();
  timer.setDurations(30, 5);
  timer.mode = "break";
  timer.start();
  timer.stop();
  assert.equal(timer.mode, "work");
  assert.equal(timer.state, "stopped");
  assert.equal(timer.formatRemaining(), "30:00");
});

test("стоп в работе: режим работы, полная длительность", () => {
  const { timer } = makeTimer();
  timer.setDurations(30, 5);
  timer.start();
  timer.stop();
  assert.equal(timer.mode, "work");
  assert.equal(timer.state, "stopped");
  assert.equal(timer.formatRemaining(), "30:00");
});

test("автозапуск перерыва: и после записи сводки, и при отказе от неё", () => {
  // закончилась работа, авто-перерыв включён, таймер стоит в режиме перерыва
  assert.equal(shouldAutoBreak(true, true, "stopped", "break"), true);
  // ручной вызов окна сводки (работа не заканчивалась) — не запускать
  assert.equal(shouldAutoBreak(true, false, "stopped", "break"), false);
  // авто-перерыв выключен в настройках
  assert.equal(shouldAutoBreak(false, true, "stopped", "break"), false);
  // пользователь уже сам что-то запустил
  assert.equal(shouldAutoBreak(true, true, "running", "break"), false);
  // режим уже не перерыв
  assert.equal(shouldAutoBreak(true, true, "stopped", "work"), false);
});
