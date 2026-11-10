// src/core.ts — чистая логика без импорта Obsidian. Покрыта unit-тестами.

export interface PomodoroBlock {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
  heading: string; // "## 🍅 HH:mm — HH:mm"
}

export function pad2(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export function formatHHmm(d: Date): string {
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes());
}

// Превращает "HH:mm" в Date на том же календарном дне, что и base.
export function parseHHmmToDate(s: string, base: Date): Date {
  const [h, m] = s.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

// R6: время начала блока. Фактическое начало; не раньше конца последнего блока.
export function computeStartTime(actualStart: Date, lastBlockEnd: Date | null): Date {
  if (lastBlockEnd && actualStart.getTime() < lastBlockEnd.getTime()) {
    return new Date(lastBlockEnd.getTime());
  }
  return new Date(actualStart.getTime());
}

// Собирает markdown-блок помодоро (формат ТЗ 4.2).
export function formatPomodoroBlock(start: Date, end: Date, lines: string[]): string {
  const head = `## 🍅 ${formatHHmm(start)} — ${formatHHmm(end)}\n\n`;
  const body = lines.map((l) => `- ${l.trim()}`).join("\n");
  return head + body + "\n";
}

// Конец (HH:mm) ПОСЛЕДНЕГО блока в заметке, либо null.
export function parseLastBlockEnd(content: string): string | null {
  const re = /^## 🍅 (\d{2}:\d{2}) — (\d{2}:\d{2})/gm;
  let m;
  let last: string | null = null;
  while ((m = re.exec(content)) !== null) {
    last = m[2];
  }
  return last;
}

// Все блоки помодоро в заметке.
export function parsePomodoroBlocks(content: string): PomodoroBlock[] {
  const re = /^## 🍅 (\d{2}:\d{2}) — (\d{2}:\d{2})/gm;
  const out: PomodoroBlock[] = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    out.push({ start: m[1], end: m[2], heading: m[0] });
  }
  return out;
}

export interface DayStat {
  day: string; // "2026-11-10"
  count: number;
  minutes: number;
}

// Агрегирует помодоро по дням (отсортировано по дате).
export function aggregateStats(days: { day: string; content: string }[]): DayStat[] {
  return days
    .map((d) => {
      const blocks = parsePomodoroBlocks(d.content);
      let minutes = 0;
      for (const b of blocks) {
        const [sh, sm] = b.start.split(":").map(Number);
        const [eh, em] = b.end.split(":").map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        minutes += diff >= 0 ? diff : 0;
      }
      return { day: d.day, count: blocks.length, minutes };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}