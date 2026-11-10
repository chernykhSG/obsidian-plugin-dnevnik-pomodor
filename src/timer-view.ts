import { ItemView, WorkspaceLeaf } from "obsidian";
import type DnevnikPomodoro from "./main";

export const TIMER_VIEW_TYPE = "dnevnik-pomodoro-timer";

export class TimerView extends ItemView {
  plugin: DnevnikPomodoro;
  private timeEl!: HTMLElement;
  private modeEl!: HTMLElement;
  private workInput!: HTMLInputElement;
  private breakInput!: HTMLInputElement;
  private startBtn!: HTMLButtonElement;

  constructor(leaf: WorkspaceLeaf, plugin: DnevnikPomodoro) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return TIMER_VIEW_TYPE;
  }
  getDisplayText() {
    return "Помодоро";
  }
  getIcon() {
    return "timer";
  }

  async onOpen() {
    const c = this.containerEl.children[1] as HTMLElement;
    c.empty();
    c.addClass("dp-timer-view");

    this.modeEl = c.createEl("div", { cls: "dp-mode" });
    this.timeEl = c.createEl("div", { cls: "dp-time", text: "00:00" });

    const row = c.createDiv({ cls: "dp-row" });
    row.createSpan({ text: "Работа (мин): " });
    this.workInput = row.createEl("input", { type: "number", value: String(this.plugin.settings.workMinutes), attr: { min: "1" } });
    row.createSpan({ text: " Перерыв (мин): " });
    this.breakInput = row.createEl("input", { type: "number", value: String(this.plugin.settings.breakMinutes), attr: { min: "0" } });

    this.workInput.addEventListener("change", () => this.applyDurations());
    this.breakInput.addEventListener("change", () => this.applyDurations());

    const btns = c.createDiv({ cls: "dp-row" });
    this.startBtn = btns.createEl("button", { text: "Старт", cls: "dp-primary" });
    const pauseBtn = btns.createEl("button", { text: "Пауза" });
    const stopBtn = btns.createEl("button", { text: "Стоп" });
    const skipBtn = btns.createEl("button", { text: "Пропустить" });
    this.startBtn.addEventListener("click", () => this.plugin.timer.start());
    pauseBtn.addEventListener("click", () => this.plugin.timer.pause());
    stopBtn.addEventListener("click", () => this.plugin.timer.stop());
    skipBtn.addEventListener("click", () => this.plugin.timer.skip());

    this.render();
  }

  render() {
    const t = this.plugin.timer;
    this.modeEl.setText(t.mode === "work" ? "🍅 Работа" : "☕ Перерыв");
    this.timeEl.setText(t.formatRemaining());
    // Поля длительностей редактируются только в состоянии «остановлен».
    const editable = t.state === "stopped";
    this.workInput.disabled = !editable;
    this.breakInput.disabled = !editable;
    this.startBtn.setText(t.state === "paused" ? "Продолжить" : "Старт");
  }

  private applyDurations() {
    this.plugin.settings.workMinutes = Math.max(1, parseInt(this.workInput.value, 10) || this.plugin.settings.workMinutes);
    this.plugin.settings.breakMinutes = Math.max(0, parseInt(this.breakInput.value, 10) || this.plugin.settings.breakMinutes);
    this.plugin.saveSettings();
    this.plugin.timer.setDurations(this.plugin.settings.workMinutes, this.plugin.settings.breakMinutes);
    this.render();
  }
}