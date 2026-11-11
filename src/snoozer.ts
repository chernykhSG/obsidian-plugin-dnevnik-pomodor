import { pad2 } from "./core";
import { createUnthrottledInterval } from "./worker-timer";

// Отложенный вопрос «начать новый помидоро?». Отсчёт идёт на Web Worker
// (createUnthrottledInterval): пользователь обычно отходит от компьютера,
// а таймеры рендерера Obsidian в фоне троттлятся.
export class Snoozer {
  private until = 0; // epoch ms; 0 — неактивна
  private stopInterval: (() => void) | null = null;

  constructor(private cb: { onWake: () => void; onTick: () => void }) {}

  get active(): boolean {
    return this.stopInterval !== null;
  }

  get remainingMs(): number {
    return this.active ? Math.max(0, this.until - Date.now()) : 0;
  }

  start(minutes: number) {
    this.cancel();
    this.until = Date.now() + Math.max(0.1, minutes) * 60_000;
    this.stopInterval = createUnthrottledInterval(() => this.tick(), 500);
    this.cb.onTick();
  }

  // Досрочная отмена: тихо, без onWake.
  cancel() {
    if (this.stopInterval !== null) {
      this.stopInterval();
      this.stopInterval = null;
    }
    this.until = 0;
    if (this.cb) this.cb.onTick();
  }

  formatRemaining(): string {
    const total = Math.max(0, Math.round(this.remainingMs / 1000));
    return pad2(Math.floor(total / 60)) + ":" + pad2(total % 60);
  }

  private tick() {
    if (!this.active) return;
    if (Date.now() >= this.until) {
      this.stopInterval?.();
      this.stopInterval = null;
      this.until = 0;
      this.cb.onWake();
      return;
    }
    this.cb.onTick();
  }
}
