import { App, Modal, Setting } from "obsidian";
import type DnevnikPomodoro from "./main";

export class CaptureModal extends Modal {
  plugin: DnevnikPomodoro;
  private textarea!: HTMLTextAreaElement;
  private resolveFn?: (lines: string[]) => void;

  constructor(app: App, plugin: DnevnikPomodoro) {
    super(app);
    this.plugin = plugin;
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
    this.textarea = contentEl.createEl("textarea", {
      attr: { rows: "6", placeholder: "Что сделал? По одному пункту в строке" },
    });
    this.textarea.style.width = "100%";

    // Enter — новая строка; Cmd/Ctrl+Enter — сохранить.
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