import { Notice, Plugin } from "obsidian";
import { DnevnikSettings, DEFAULT_SETTINGS, DnevnikSettingTab } from "./settings";
import { PomodoroTimer } from "./timer";
import { CaptureModal } from "./capture-modal";
import { StatsModal } from "./stats-modal";
import { TIMER_VIEW_TYPE, TimerView } from "./timer-view";
import { appendPomodoroBlock } from "./daily";

export default class DnevnikPomodoro extends Plugin {
  settings: DnevnikSettings = DEFAULT_SETTINGS;
  timer!: PomodoroTimer;
  timerView: TimerView | null = null;
  private audioCtx: AudioContext | null = null;
  private statusBarEl: HTMLElement | null = null;
  private workJustFinished = false;

  async onload() {
    await this.loadSettings();
    this.timer = new PomodoroTimer({
      onWorkFinished: () => this.handleWorkFinished(),
      onTick: () => this.updateTimerUI(),
    });
    this.timer.setDurations(this.settings.workMinutes, this.settings.breakMinutes);

    this.registerView(TIMER_VIEW_TYPE, (leaf) => new TimerView(leaf, this));
    this.addRibbonIcon("timer", "Помодоро", () => this.toggleTimerView());
    this.addCommand({ id: "open-timer", name: "Открыть таймер", callback: () => this.toggleTimerView() });
    this.addCommand({ id: "capture", name: "Открыть сводку помодоро", callback: () => this.openCapture(new Date()) });
    this.addCommand({ id: "stats", name: "Открыть статистику", callback: () => new StatsModal(this.app, this).open() });
    this.addCommand({ id: "timer-start", name: "Таймер: старт", callback: () => this.timer.start() });
    this.addCommand({ id: "timer-pause", name: "Таймер: пауза", callback: () => this.timer.pause() });
    this.addCommand({ id: "timer-stop", name: "Таймер: стоп", callback: () => this.timer.stop() });

    this.addSettingTab(new DnevnikSettingTab(this.app, this));
    this.updateTimerUI();
  }

  onunload() {
    this.timer?.stop();
    this.audioCtx?.close();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async toggleTimerView() {
    const existing = this.app.workspace.getLeavesOfType(TIMER_VIEW_TYPE);
    if (existing.length) {
      this.app.workspace.detachLeavesOfType(TIMER_VIEW_TYPE);
      this.timerView = null;
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;
    await leaf.setViewState({ type: TIMER_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
    const leaves = this.app.workspace.getLeavesOfType(TIMER_VIEW_TYPE);
    this.timerView = leaves.length ? (leaves[0].view as TimerView) : null;
  }

  private async handleWorkFinished() {
    this.workJustFinished = true;
    if (this.settings.sound) this.playBeep();
    if (this.settings.focusOnFinish) {
      try {
        window.focus();
      } catch (e) {
        // фокус недоступен — не критично
      }
    }
    if (this.settings.notification) {
      try {
        new Notification("Помодоро завершён", { body: "Время записать сводку" });
      } catch (e) {
        // уведомления недоступны — не критично
      }
    }
    await this.openCapture(this.timer.wallStart);
  }

  private playBeep() {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const ctx = this.audioCtx;
      if (this.settings.soundType === "long") {
        // Продолжительный сигнал: тройной тон с паузами (~1.2 с).
        [0, 450, 900].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "square";
          osc.frequency.value = 880;
          const t = ctx.currentTime + delay / 1000;
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      // звук недоступен — не критично
    }
  }

  private async openCapture(actualStart: Date) {
    const modal = new CaptureModal(this.app, this);
    const lines = await modal.openAndWait();
    let wrote = false;
    if (lines && lines.length) {
      try {
        await appendPomodoroBlock(this, actualStart, lines);
        new Notice("Сводка записана");
        wrote = true;
      } catch (e) {
        new Notice("Не удалось записать сводку: " + (e as Error).message);
      }
    }
    if (
      wrote &&
      this.settings.autoBreak &&
      this.workJustFinished &&
      this.timer.state === "stopped" &&
      this.timer.mode === "break"
    ) {
      this.timer.start();
    }
    this.workJustFinished = false;
  }

  private updateTimerUI() {
    if (!this.statusBarEl) this.statusBarEl = this.addStatusBarItem();
    const label = this.timer.mode === "work" ? "🍅" : "☕";
    this.statusBarEl.setText(`${label} ${this.timer.formatRemaining()}`);
    if (this.timerView) this.timerView.render();
  }
}