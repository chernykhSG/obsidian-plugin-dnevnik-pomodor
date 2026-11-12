import { ItemView, WorkspaceLeaf } from "obsidian";
import type DnevnikPomodoro from "./main";
import { StatsModal } from "./stats-modal";

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
  private cancelSnoozeBtn!: HTMLButtonElement;

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
    // Регистрируем себя в плагине: view может быть создано фабрикой registerView
    // (восстановление workspace, reload плагина), когда toggleTimerView не вызывается.
    // Без этого updateTimerUI не найдёт view и панель не будет обновляться.
    this.plugin.timerView = this;
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
    this.cancelSnoozeBtn = btns.createEl("button", { text: "Отменить отсрочку" });
    this.cancelSnoozeBtn.addEventListener("click", () => this.plugin.snoozer.cancel());

    const extra = c.createDiv({ cls: "dp-row" });
    const noteBtn = extra.createEl("button", { text: "📝 Заметка" });
    noteBtn.addEventListener("click", () => this.plugin.captureNow());
    const statsBtn = extra.createEl("button", { text: "📊 Статистика" });
    statsBtn.addEventListener("click", () => new StatsModal(this.plugin.app, this.plugin).open());

    this.render();
  }

  async onClose() {
    // Сбрасываем ссылку, иначе плагин будет рендерить в отсоединённый view.
    if (this.plugin.timerView === this) this.plugin.timerView = null;
  }

  render() {
    const t = this.plugin.timer;
    // Отсрочка показывается вместо таймера, пока он остановлен.
    const snoozed = this.plugin.snoozer && this.plugin.snoozer.active && t.state === "stopped";
    this.modeEl.setText(snoozed ? "⏳ Помидоро отложен" : t.mode === "work" ? "🍅 Работа" : "☕ Перерыв");
    this.timeEl.setText(snoozed ? this.plugin.snoozer.formatRemaining() : t.formatRemaining());
    // Поля длительностей редактируются только в состоянии «остановлен».
    const editable = t.state === "stopped";
    this.workInput.disabled = !editable;
    this.breakInput.disabled = !editable;
    // Кнопки по состоянию: пауза/стоп — только после запуска, «Пропустить» — в перерыве.
    this.startBtn.setText(t.state === "paused" ? "Продолжить" : "Старт");
    this.startBtn.style.display = t.state === "running" ? "none" : "";
    this.pauseBtn.style.display = t.state === "running" ? "" : "none";
    this.stopBtn.style.display = t.state === "stopped" ? "none" : "";
    this.skipBtn.style.display = t.mode === "break" && !snoozed ? "" : "none";
    // Отсрочка: «Старт» доступен (запуск отменит вопрос будильником), плюс отмена.
    this.cancelSnoozeBtn.style.display = snoozed ? "" : "none";
  }

  private applyDurations() {
    this.plugin.settings.workMinutes = Math.max(1, parseInt(this.workInput.value, 10) || this.plugin.settings.workMinutes);
    this.plugin.settings.breakMinutes = Math.max(0, parseInt(this.breakInput.value, 10) || this.plugin.settings.breakMinutes);
    this.plugin.saveSettings();
    this.plugin.timer.setDurations(this.plugin.settings.workMinutes, this.plugin.settings.breakMinutes);
    this.render();
  }
}