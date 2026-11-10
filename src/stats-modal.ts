import { App, Modal, Setting } from "obsidian";
import type DnevnikPomodoro from "./main";
import { aggregateStats } from "./core";
import { momentFn } from "./moment";

export class StatsModal extends Modal {
  plugin: DnevnikPomodoro;
  private cursor = momentFn().startOf("month");
  private bodyEl!: HTMLElement;
  private renderGen = 0;

  constructor(app: App, plugin: DnevnikPomodoro) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "Статистика помодоро" });

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("◀").onClick(() => { this.cursor.subtract(1, "month"); this.render(); }))
      .addButton((b) => b.setButtonText("▶").onClick(() => { this.cursor.add(1, "month"); this.render(); }));

    this.bodyEl = contentEl.createDiv();
    this.render();
  }

  private async render() {
    const gen = ++this.renderGen;
    this.bodyEl.empty();
    const settings = this.plugin.settings;
    const month = this.cursor.format("YYYY-MM");
    this.bodyEl.createEl("div", { text: this.cursor.format("MMMM YYYY"), cls: "dp-stats-month" });

    const fmt = settings.dailyNameFormat;
    const matched = this.plugin.app.vault
      .getMarkdownFiles()
      .filter((f) => f.path.startsWith(settings.dailyFolder + "/"))
      .map((f) => ({ f, date: momentFn(f.basename, fmt, true) }))
      .filter((x) => x.date.isValid() && x.date.format("YYYY-MM") === month)
      .sort((a, b) => a.date.valueOf() - b.date.valueOf());

    const days: { day: string; content: string }[] = [];
    for (const x of matched) {
      days.push({ day: x.date.format("YYYY-MM-DD"), content: await this.plugin.app.vault.cachedRead(x.f) });
    }
    if (gen !== this.renderGen) return;
    const stats = aggregateStats(days);

    const table = this.bodyEl.createEl("table");
    table.createEl("thead").createEl("tr", {}, (tr) => {
      tr.createEl("th", { text: "День" });
      tr.createEl("th", { text: "Помодоро" });
      tr.createEl("th", { text: "Минуты" });
    });
    const tbody = table.createEl("tbody");

    let totalCount = 0;
    let totalMin = 0;
    for (const s of stats) {
      totalCount += s.count;
      totalMin += s.minutes;
      const tr = tbody.createEl("tr");
      tr.createEl("td", { text: s.day });
      tr.createEl("td", { text: String(s.count) });
      tr.createEl("td", { text: String(s.minutes) });
    }
    const trTotal = tbody.createEl("tr");
    trTotal.createEl("td", { text: "Итого", cls: "dp-total" });
    trTotal.createEl("td", { text: String(totalCount), cls: "dp-total" });
    trTotal.createEl("td", { text: String(totalMin), cls: "dp-total" });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}