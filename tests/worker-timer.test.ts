import { test } from "node:test";
import assert from "node:assert/strict";
import { createUnthrottledInterval, workerIntervalScript } from "../src/worker-timer";

// Мок Web Worker: проверяем контракт — колбэк вызывается по postMessage
// из воркера, stop() терминирует воркер.
class FakeWorker {
  static last: FakeWorker | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  terminated = false;
  constructor(public url: string) {
    FakeWorker.last = this;
  }
  postMessage() {}
  addEventListener(_t: string, cb: (ev: { data: unknown }) => void) {
    this.onmessage = cb;
  }
  terminate() {
    this.terminated = true;
  }
}

test("createUnthrottledInterval: worker-режим — тики приходят из воркера, stop терминирует", () => {
  const g = globalThis as unknown as { Worker?: unknown };
  const savedWorker = g.Worker;
  const savedCreateObjectURL = globalThis.URL.createObjectURL;
  g.Worker = FakeWorker;
  globalThis.URL.createObjectURL = (() => "blob:fake") as never;

  try {
    let ticks = 0;
    const stop = createUnthrottledInterval(() => ticks++, 500);
    assert.ok(FakeWorker.last, "воркер создан");
    FakeWorker.last!.onmessage?.({ data: null });
    FakeWorker.last!.onmessage?.({ data: null });
    assert.equal(ticks, 2);
    stop();
    assert.ok(FakeWorker.last!.terminated, "воркер терминирован");
  } finally {
    g.Worker = savedWorker;
    globalThis.URL.createObjectURL = savedCreateObjectURL;
  }
});

test("createUnthrottledInterval: без Worker — fallback на setInterval", async () => {
  const g = globalThis as unknown as { Worker?: unknown };
  const savedWorker = g.Worker;
  g.Worker = undefined;
  let ticks = 0;
  try {
    const stop = createUnthrottledInterval(() => ticks++, 20);
    await new Promise((r) => setTimeout(r, 70));
    stop();
    const after = ticks;
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(ticks >= 2, `были тики (${ticks})`);
    assert.equal(ticks, after, "после stop() тиков нет");
  } finally {
    g.Worker = savedWorker;
  }
});

test("workerIntervalScript: код воркера шлёт сообщения по setInterval", () => {
  const src = workerIntervalScript(123);
  assert.ok(src.includes("123"), "интервал подставлен");
  assert.ok(src.includes("setInterval"));
  assert.ok(src.includes("postMessage"));
});
