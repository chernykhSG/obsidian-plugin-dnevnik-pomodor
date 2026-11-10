import { App, Modal, Setting } from "obsidian";
import type DnevnikPomodoro from "./main";
import { formatHHmm } from "./core";

export class CaptureModal extends Modal {
  plugin: DnevnikPomodoro;
  private actualStart: Date;
  private textarea!: HTMLTextAreaElement;
  private previewEl!: HTMLElement;
  private resolveFn?: (lines: string[]) => void;

  constructor(app: App, plugin: DnevnikPomodoro, actualStart: Date) {
    super(app);
    this.plugin = plugin;
    this.actualStart = actualStart;
  }

  openAndWait(): Promise<string[]> {
    this.open();
    return new Promise((res) => {
      this.resolveFn = res;
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "🍅 Итог помодоро" });
    contentEl.createEl("div", { text: "Каждая строка станет пунктом списка. Блок вставится в заметку как показано ниже:", cls: "dp-capture-hint" });
    this.textarea = contentEl.createEl("textarea", {
      attr: { rows: "5", placeholder: "Что сделал? По одному пункту в строке" },
    });
    this.textarea.style.width = "100%";

    this.previewEl = contentEl.createEl("pre", { cls: "dp-capture-preview" });
    this.updatePreview();

    // Enter — новая строка; Cmd/Ctrl+Enter — сохранить.
    this.textarea.addEventListener("input", () => this.updatePreview());
    this.textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        this.submit();
      }
    });

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText("Сохранить").setCta().onClick(() => this.submit())
      )
      .addButton((b) =>
        b.setButtonText("Отмена").onClick(() => {
          this.close();
        })
      );
  }

  private updatePreview() {
    const start = formatHHmm(this.actualStart);
    const end = formatHHmm(new Date());
    const lines = this.textarea.value
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const body = lines.length ? "\n" + lines.map((l) => `- ${l}`).join("\n") : "\n(пункты появятся здесь)";
    this.previewEl.setText(`## 🍅 ${start} — ${end}${body}`);
  }

  private submit() {
    const lines = this.textarea.value
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const fn = this.resolveFn;
    this.resolveFn = undefined;
    fn?.(lines);
    this.close();
  }

  onClose() {
    if (this.resolveFn) {
      this.resolveFn([]);
      this.resolveFn = undefined;
    }
    const { contentEl } = this;
    contentEl.empty();
  }
}