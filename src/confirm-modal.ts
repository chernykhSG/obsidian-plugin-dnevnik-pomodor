import { App, Modal, Setting } from "obsidian";

// Результат: "yes" — главный вариант, "no" — отказ, number — отложить на N минут.
export type ConfirmResult = "yes" | "no" | number;

export interface SnoozeOption {
  label: string; // текст кнопки, например «Отложить»
  defaultMinutes: number;
}

// Модалка-вопрос с двумя кнопками и (опционально) отсрочкой.
// Esc/крестик/«Не сейчас» — "no".
export class ConfirmModal extends Modal {
  private resolveFn?: (r: ConfirmResult) => void;
  private snoozeInput: HTMLInputElement | null = null;

  constructor(
    app: App,
    private title: string,
    private yesText: string,
    private noText: string,
    private snooze?: SnoozeOption
  ) {
    super(app);
  }

  openAndWait(): Promise<ConfirmResult> {
    this.open();
    return new Promise((res) => {
      this.resolveFn = res;
    });
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: this.title });
    new Setting(contentEl)
      .addButton((b) => b.setButtonText(this.yesText).setCta().onClick(() => this.answer("yes")))
      .addButton((b) => b.setButtonText(this.noText).onClick(() => this.answer("no")));
    if (this.snooze) {
      const s = new Setting(contentEl);
      this.snoozeInput = s.controlEl.createEl("input", {
        type: "number",
        value: String(this.snooze.defaultMinutes),
        attr: { min: "1", max: "180" },
      });
      this.snoozeInput.style.width = "60px";
      s.addButton((b) =>
        b.setButtonText(this.snooze!.label).onClick(() => {
          const parsed = parseInt(this.snoozeInput?.value ?? "", 10);
          this.answer(Number.isNaN(parsed) || parsed < 1 ? this.snooze!.defaultMinutes : parsed);
        })
      );
    }
  }

  onClose() {
    this.answer("no");
    this.contentEl.empty();
  }

  private answer(r: ConfirmResult) {
    if (!this.resolveFn) return; // уже отвечено (кнопкой или закрытием)
    const fn = this.resolveFn;
    this.resolveFn = undefined;
    fn(r);
    this.close(); // без этого окно висит открытым после клика по кнопке
  }
}
