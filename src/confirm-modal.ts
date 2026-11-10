import { App, Modal, Setting } from "obsidian";

// Модалка-вопрос с двумя кнопками. Esc/крестик/«Не сейчас» — false.
export class ConfirmModal extends Modal {
  private resolveFn?: (yes: boolean) => void;

  constructor(app: App, private title: string, private yesText: string, private noText: string) {
    super(app);
  }

  openAndWait(): Promise<boolean> {
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
      .addButton((b) =>
        b.setButtonText(this.yesText).setCta().onClick(() => this.answer(true))
      )
      .addButton((b) => b.setButtonText(this.noText).onClick(() => this.answer(false)));
  }

  onClose() {
    this.answer(false);
    this.contentEl.empty();
  }

  private answer(yes: boolean) {
    if (!this.resolveFn) return; // уже отвечено (кнопкой или закрытием)
    const fn = this.resolveFn;
    this.resolveFn = undefined;
    fn?.(yes);
    this.close(); // без этого окно висит открытым после клика по кнопке
  }
}
