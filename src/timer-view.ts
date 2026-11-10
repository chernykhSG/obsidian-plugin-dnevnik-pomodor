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
  private pauseBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private skipBtn!: HTMLButtonElement;

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
    row.createSpan({ text: "Работа" });
    this.workInput = row.createEl("input", { type: "number", value: String(this.plugin.settings.workMinutes), attr: { min: "1" } });
    row.createSpan({ text: "Перерыв" });
    this.breakInput = row.createEl("input", { type: "number", value: String(this.plugin.settings.breakMinutes), attr: { min: "0" } });

    this.workInput.addEventListener("change", () => this.applyDurations());
    this.breakInput.addEventListener("change", () => this.applyDurations());

    const btns = c.createDiv({ cls: "dp-row" });
    this.startBtn = btns.createEl("button", { text: "Старт", cls: "dp-primary" });
    this.pauseBtn = btns.createEl("button", { text: "Пауза" });
    this.stopBtn = btns.createEl("button", { text: "Стоп" });
    this.skipBtn = btns.createEl("button", { text: "Пропустить" });
    this.startBtn.addEventListener("click", () => this.plugin.timer.start());
    this.pauseBtn.addEventListener("click", () => this.plugin.timer.pause());
    this.stopBtn.addEventListener("click", () => this.plugin.timer.stop());
    this.skipBtn.addEventListener("click", () => this.plugin.timer.skip());

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
    // Кнопки по состоянию: пауза/стоп — только после запуска, «Пропустить» — в перерыве.
    this.startBtn.setText(t.state === "paused" ? "Продолжить" : "Старт");
    this.startBtn.style.display = t.state === "running" ? "none" : "";
    this.pauseBtn.style.display = t.state === "running" ? "" : "none";
    this.stopBtn.style.display = t.state === "stopped" ? "none" : "";
    this.skipBtn.style.display = t.mode === "break" ? "" : "none";
  }

  private applyDurations() {
    this.plugin.settings.workMinutes = Math.max(1, parseInt(this.workInput.value, 10) || this.plugin.settings.workMinutes);
    this.plugin.settings.breakMinutes = Math.max(0, parseInt(this.breakInput.value, 10) || this.plugin.settings.breakMinutes);
    this.plugin.saveSettings();
    this.plugin.timer.setDurations(this.plugin.settings.workMinutes, this.plugin.settings.breakMinutes);
    this.render();
  }
}