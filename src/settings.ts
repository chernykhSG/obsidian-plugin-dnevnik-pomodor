import { App, PluginSettingTab, Setting } from "obsidian";
import type DnevnikPomodoro from "./main";

export interface DnevnikSettings {
  workMinutes: number;
  breakMinutes: number;
  sound: boolean;
  notification: boolean;
  autoBreak: boolean;
  dailyFolder: string;
  dailyNameFormat: string;
  dailyTemplate: string;
}

export const DEFAULT_SETTINGS: DnevnikSettings = {
  workMinutes: 30,
  breakMinutes: 5,
  sound: true,
  notification: true,
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
      .setName("Системное уведомление")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.notification).onChange(async (v) => {
          this.plugin.settings.notification = v;
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