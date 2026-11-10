import { App, PluginSettingTab, Setting } from "obsidian";
import type DnevnikPomodoro from "./main";

export interface DnevnikSettings {
  workMinutes: number;
  breakMinutes: number;
  sound: boolean;
  soundType: "short" | "long" | "chime" | "dingdong" | "alarm";
  notification: boolean;
  focusOnFinish: boolean;
  autoBreak: boolean;
  dailyFolder: string;
  dailyNameFormat: string;
  dailyTemplate: string;
}

export const DEFAULT_SETTINGS: DnevnikSettings = {
  workMinutes: 30,
  breakMinutes: 5,
  sound: true,
  soundType: "chime",
  notification: true,
  focusOnFinish: true,
  autoBreak: true,
  dailyFolder: "Ежедневник",
  dailyNameFormat: "YYYY-MM-DD",
  dailyTemplate: "Шаблоны/Ежедневная.md",
};

export class DnevnikSettingTab extends PluginSettingTab {
  plugin: DnevnikPomodoro;
  constructor(app: App, plugin: DnevnikPomodoro) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Длительность работы (мин)")
      .addText((t) =>
        t.setValue(String(this.plugin.settings.workMinutes)).onChange(async (v) => {
          const parsed = parseInt(v, 10);
          this.plugin.settings.workMinutes = Number.isNaN(parsed) ? 30 : Math.max(1, parsed);
          await this.plugin.saveSettings();
          this.plugin.timer.setDurations(this.plugin.settings.workMinutes, this.plugin.settings.breakMinutes);
        })
      );

    new Setting(containerEl)
      .setName("Длительность перерыва (мин)")
      .addText((t) =>
        t.setValue(String(this.plugin.settings.breakMinutes)).onChange(async (v) => {
          const parsed = parseInt(v, 10);
          this.plugin.settings.breakMinutes = Number.isNaN(parsed) ? 5 : Math.max(0, parsed);
          await this.plugin.saveSettings();
          this.plugin.timer.setDurations(this.plugin.settings.workMinutes, this.plugin.settings.breakMinutes);
        })
      );

    new Setting(containerEl)
      .setName("Звук по завершении")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.sound).onChange(async (v) => {
          this.plugin.settings.sound = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Звук уведомления")
      .addDropdown((d) =>
        d
          .addOption("short", "Короткий")
          .addOption("long", "Продолжительный")
          .addOption("chime", "Мелодия")
          .addOption("dingdong", "Динь-дон")
          .addOption("alarm", "Сирена")
          .setValue(this.plugin.settings.soundType)
          .onChange(async (v) => {
            this.plugin.settings.soundType = v as DnevnikSettings["soundType"];
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Системное уведомление")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.notification).onChange(async (v) => {
          this.plugin.settings.notification = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Фокусировать Obsidian по завершении")
      .setDesc("Переводит окно Obsidian на передний план, чтобы окно сводки было видно")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.focusOnFinish).onChange(async (v) => {
          this.plugin.settings.focusOnFinish = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Автозапуск перерыва после сводки")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.autoBreak).onChange(async (v) => {
          this.plugin.settings.autoBreak = v;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Папка ежедневных заметок")
      .addText((t) =>
        t.setValue(this.plugin.settings.dailyFolder).onChange(async (v) => {
          this.plugin.settings.dailyFolder = v.trim() || "Ежедневник";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Формат имени ежедневной заметки")
      .setDesc("Moment-формат без расширения")
      .addText((t) =>
        t.setValue(this.plugin.settings.dailyNameFormat).onChange(async (v) => {
          this.plugin.settings.dailyNameFormat = v.trim() || "YYYY-MM-DD";
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Шаблон ежедневной заметки")
      .addText((t) =>
        t.setValue(this.plugin.settings.dailyTemplate).onChange(async (v) => {
          this.plugin.settings.dailyTemplate = v.trim();
          await this.plugin.saveSettings();
        })
      );
  }
}