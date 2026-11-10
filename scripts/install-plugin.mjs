import { cpSync, mkdirSync } from "node:fs";

const dest = "/Users/s.chernykh/Ежедневник/Дневник работы/.obsidian/plugins/dnevnik-pomodoro";
mkdirSync(dest, { recursive: true });
for (const f of ["main.js", "manifest.json", "styles.css"]) {
  cpSync(f, dest + "/" + f);
}
console.log("installed to " + dest);