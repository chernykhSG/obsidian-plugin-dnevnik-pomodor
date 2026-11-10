// src/moment.ts — Obsidian ре-экспортирует moment, но в типах это namespace-тип (не callable).
// На рантайме значение — callable moment, поэтому используем этот алиас.
import { moment } from "obsidian";

export const momentFn = moment as unknown as typeof import("moment");