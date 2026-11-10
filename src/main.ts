import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, type DnevnikSettings } from "./settings";

export default class DnevnikPomodoro extends Plugin {
  // Заглушки, наполняются в Task 9
  settings: DnevnikSettings = DEFAULT_SETTINGS;
  timer = {
    setDurations(_workMinutes: number, _breakMinutes: number) {},
  };
  async saveSettings() {}

  async onload() {
    // заглушка, наполняется в Task 9
  }
}