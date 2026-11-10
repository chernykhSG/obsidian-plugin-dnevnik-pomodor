import { TFile } from "obsidian";
import type DnevnikPomodoro from "./main";
import { computeStartTime, formatPomodoroBlock, parseLastBlockEnd, parseHHmmToDate } from "./core";
import { momentFn } from "./moment";

// Дописывает блок помодоро в сегодняшнюю заметку; создаёт заметку по шаблону, если её нет.
export async function appendPomodoroBlock(plugin: DnevnikPomodoro, actualStart: Date, lines: string[]): Promise<void> {
  if (!lines.length) return;

  const settings = plugin.settings;
  const name = momentFn().format(settings.dailyNameFormat);
  const path = `${settings.dailyFolder}/${name}.md`;

  let file = plugin.app.vault.getAbstractFileByPath(path) as TFile | null;
  if (!file) {
    await ensureFolder(plugin, settings.dailyFolder);
    file = await createDailyNote(plugin, path);
  }

  const content = await plugin.app.vault.read(file);
  const lastEndStr = parseLastBlockEnd(content);
  const now = new Date();
  let lastEnd: Date | null = null;
  if (lastEndStr) lastEnd = parseHHmmToDate(lastEndStr, now);

  const start = computeStartTime(actualStart, lastEnd);
  const block = formatPomodoroBlock(start, now, lines);

  await plugin.app.vault.append(file, "\n" + block);
}

async function createDailyNote(plugin: DnevnikPomodoro, path: string): Promise<TFile> {
  const settings = plugin.settings;
  let template = "# \n";
  if (settings.dailyTemplate) {
    const tpl = plugin.app.vault.getAbstractFileByPath(settings.dailyTemplate) as TFile | null;
    if (tpl) {
      template = await plugin.app.vault.read(tpl);
      template = template.replace(/{{date:([^}]+)}}/g, (_, fmt: string) => momentFn().format(fmt));
    }
  }
  return plugin.app.vault.create(path, template);
}

// Создаёт папку (и вложенные папки) ежедневных заметок, если она ещё не существует.
async function ensureFolder(plugin: DnevnikPomodoro, folder: string): Promise<void> {
  const { vault } = plugin.app;
  const normalized = folder.replace(/^\/+|\/+$/g, "");
  if (!normalized || vault.getFolderByPath(normalized)) return;
  const parts = normalized.split("/");
  let cur = "";
  for (const p of parts) {
    cur = cur ? `${cur}/${p}` : p;
    if (!vault.getFolderByPath(cur)) {
      await vault.createFolder(cur);
    }
  }
}