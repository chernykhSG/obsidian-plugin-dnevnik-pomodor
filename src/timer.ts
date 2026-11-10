import { pad2 } from "./core";
import { createUnthrottledInterval } from "./worker-timer";

export type TimerMode = "work" | "break";
export type TimerState = "stopped" | "running" | "paused";

export interface TimerCallbacks {
  onWorkFinished: () => void;
  onTick: () => void;
}

export class PomodoroTimer {
  mode: TimerMode = "work";
  state: TimerState = "stopped";
  workMinutes = 30;
  breakMinutes = 5;
  private durationSec = 30 * 60;
  private remainingMs = 30 * 60 * 1000;
  private startedAt = 0;
  private segmentStart = 0;
  private segmentRemainingMs = 30 * 60 * 1000;
  private stopInterval: (() => void) | null = null;
  private cb: TimerCallbacks;

  constructor(cb: TimerCallbacks) {
    this.cb = cb;
  }

  // Длительности обновляются всегда (подхватятся при следующем старте);
  // текущий идущий/пауза-интервал не трогаем.
  setDurations(work: number, br: number) {
    this.workMinutes = Math.max(1, work);
    this.breakMinutes = Math.max(0, br);
    if (this.state !== "stopped") return;
    this.durationSec = (this.mode === "work" ? this.workMinutes : this.breakMinutes) * 60;
    this.remainingMs = this.durationSec * 1000;
    this.cb.onTick();
  }

  start() {
    if (this.state === "running") return;
    if (this.state === "stopped") {
      this.durationSec = (this.mode === "work" ? this.workMinutes : this.breakMinutes) * 60;
      this.remainingMs = this.durationSec * 1000;
      this.startedAt = Date.now();
      this.segmentStart = Date.now();
      this.segmentRemainingMs = this.remainingMs;
    } else {
      // resume from paused
      this.segmentStart = Date.now();
      this.segmentRemainingMs = this.remainingMs;
    }
    this.state = "running";
    this.stopInterval = createUnthrottledInterval(() => this.tick(), 500);
    this.cb.onTick();
  }

  pause() {
    if (this.state !== "running") return;
    this.remainingMs = Math.max(0, this.segmentRemainingMs - (Date.now() - this.segmentStart));
    this.state = "paused";
    if (this.stopInterval !== null) {
      this.stopInterval();
      this.stopInterval = null;
    }
    this.cb.onTick();
  }

  stop() {
    if (this.stopInterval !== null) {
      this.stopInterval();
      this.stopInterval = null;
    }
    this.state = "stopped";
    this.remainingMs = this.durationSec * 1000;
    this.cb.onTick();
  }

  // Пропустить текущий интервал: сразу перейти к следующему режиму
  // (работа <-> перерыв) без запуска и без вызова onWorkFinished.
  skip() {
    if (this.stopInterval !== null) {
      this.stopInterval();
      this.stopInterval = null;
    }
    this.state = "stopped";
    this.mode = this.mode === "work" ? "break" : "work";
    this.durationSec = (this.mode === "work" ? this.workMinutes : this.breakMinutes) * 60;
    this.remainingMs = this.durationSec * 1000;
    this.cb.onTick();
  }

  // Момент запуска текущего рабочего интервала (настенные часы).
  get wallStart(): Date {
    return new Date(this.startedAt);
  }

  formatRemaining(): string {
    const total = Math.max(0, Math.round(this.remainingMs / 1000));
    const mm = Math.floor(total / 60);
    const ss = total % 60;
    return pad2(mm) + ":" + pad2(ss);
  }

  private tick() {
    if (this.state !== "running") return;
    this.remainingMs = this.segmentRemainingMs - (Date.now() - this.segmentStart);
    if (this.remainingMs <= 0) {
      this.remainingMs = 0;
      this.finish();
      return;
    }
    this.cb.onTick();
  }

  private finish() {
    if (this.stopInterval !== null) {
      this.stopInterval();
      this.stopInterval = null;
    }
    this.state = "stopped";
    if (this.mode === "work") {
      this.mode = "break";
      this.cb.onWorkFinished();
    } else {
      this.mode = "work";
    }
    this.durationSec = (this.mode === "work" ? this.workMinutes : this.breakMinutes) * 60;
    this.remainingMs = this.durationSec * 1000;
    this.cb.onTick();
  }
}