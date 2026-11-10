import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type DnevnikSettings } from "./settings";

export default class DnevnikPomodoro extends Plugin {
  // Заглушки, наполняются в Task 9
  settings: DnevnikSettings = DEFAULT_SETTINGS;
  // Заглушка, заменяется реальным PomodoroTimer в Task 9.
  // Тип `any` — минимальное расширение, чтобы TimerView проходил строгий tsc.
  timer: any;
  async saveSettings() {}

  async onload() {
    // заглушка, наполняется в Task 9
  }
}