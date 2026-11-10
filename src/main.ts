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

  // Поднимает окно Obsidian на передний план. window.focus() в Electron (macOS)
  // не активирует приложение, если оно в фоне — нужен BrowserWindow.show()
  // и app.focus({steal:true}): macOS по умолчанию запрещает фоновому приложению
  // перехватывать фокус. Obsidian выставляет глобальные window.electronWindow
  // и window.electron.remote (проверено по obsidian.asar); на мобильных их нет —
  // fallback на window.focus().
  private focusObsidianWindow() {
    try {
      type Win = { isMinimized?: () => boolean; restore?: () => void; show: () => void; focus: () => void };
      const w = window as unknown as {
        electronWindow?: Win;
        electron?: {
          remote?: {
            app?: { focus?: (opts?: { steal?: boolean }) => void };
            getCurrentWindow?: () => Win;
          };
        };
      };
      const remote = w.electron?.remote;
      const win = w.electronWindow ?? remote?.getCurrentWindow?.();
      if (win) {
        remote?.app?.focus?.({ steal: true }); // активировать приложение macOS
        if (win.isMinimized?.()) win.restore?.();
        win.show();
        win.focus();
        return;
      }
    } catch (e) {
      // Electron API недоступен — не критично, пробуем фолбэк ниже.
    }
    try {
      window.focus();
    } catch (e) {
      // фокус недоступен — не критично
    }
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
    // Ссылку на view не ищем вручную: TimerView регистрирует себя в onOpen.
  }

  private async handleWorkFinished() {
    this.workJustFinished = true;
    if (this.settings.sound) this.playBeep();
    if (this.settings.focusOnFinish) {
      this.focusObsidianWindow();
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
      switch (this.settings.soundType) {
        case "chime":
          // Мелодия: лёгкая восходяще-нисходящая фраза в до-мажоре.
          this.melody(ctx);
          break;
        case "dingdong":
          // Динь-дон: два низких тона с долгим затуханием.
          this.tone(ctx, [659.25, 523.25], 0.7, "sine", 0.14);
          break;
        case "alarm":
          // Сирена: чередование высокого и низкого тона.
          for (let i = 0; i < 4; i++) {
            this.beep(ctx, i * 700, 880, 0.25, 0.18, "square");
            this.beep(ctx, i * 700 + 300, 660, 0.25, 0.18, "square");
          }
          break;
        case "long":
          // Продолжительный: тройной тон с паузами (~1.2 с).
          this.tone(ctx, [880, 880, 880], 0.45, "square", 0.15);
          break;
        default:
          // Короткий: одиночный тон (~0.5 с).
          this.beep(ctx, 0, 880, 0.5, 0.2, "square");
      }
    } catch (e) {
      // звук недоступен — не критично
    }
  }

  // Один тон заданной частоты и длительности.
  private beep(ctx: AudioContext, delayMs: number, freq: number, duration: number, volume: number, type: OscillatorType) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + delayMs / 1000;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // Последовательность тонов с интервалом gap секунд.
  private tone(ctx: AudioContext, freqs: number[], gap: number, type: OscillatorType, volume: number) {
    freqs.forEach((f, i) => this.beep(ctx, i * gap * 1000, f, gap * 0.7, volume, type));
  }

  // Мелодия: восходяще-нисходящая фраза в до-мажоре (C5-E5-G5-E5-C5), синусоида.
  private melody(ctx: AudioContext) {
    const notes: [number, number][] = [
      [523.25, 0.4], // C5
      [659.25, 0.4], // E5
      [783.99, 0.4], // G5
      [659.25, 0.4], // E5
      [523.25, 0.7], // C5 (дольше, финал)
    ];
    let t = 0;
    for (const [f, d] of notes) {
      this.beep(ctx, t * 1000, f, d, 0.12, "sine");
      t += d + 0.1;
    }
  }

  private async openCapture(actualStart: Date) {
    const modal = new CaptureModal(this.app, this, actualStart);
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