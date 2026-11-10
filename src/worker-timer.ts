// Интервал, который не троттлится в фоне.
//
// Chromium ограничивает setInterval в скрытом/перекрытом окне (до 1 раза/мин
// после 5 минут в фоне), поэтому таймер помодоро в рендерере Obsidian
// «замирает», пока пользователь в другом приложении. Web Worker'ы троттлингу
// не подчиняются — сам Obsidian создаёт blob-воркеров (проверено по
// obsidian.asar), значит CSP это разрешает. Fallback — обычный setInterval.

// Код воркера: раз в `ms` шлёт сообщение в главный поток.
export function workerIntervalScript(ms: number): string {
  return `setInterval(() => postMessage(0), ${ms});`;
}

// Возвращает функцию остановки. Колбэк вызывается в главном потоке.
export function createUnthrottledInterval(cb: () => void, ms: number): () => void {
  try {
    const W = (globalThis as { Worker?: typeof Worker }).Worker;
    const createObjectURL = (globalThis as { URL?: { createObjectURL?: (b: Blob) => string } }).URL?.createObjectURL;
    if (!W || !createObjectURL) throw new Error("Worker недоступен");
    const blob = new Blob([workerIntervalScript(ms)], { type: "text/javascript" });
    const url = createObjectURL(blob);
    const worker = new W(url);
    worker.addEventListener("message", () => cb());
    return () => {
      worker.terminate();
      try {
        (globalThis as { URL: { revokeObjectURL?: (u: string) => void } }).URL.revokeObjectURL?.(url);
      } catch (e) {
        // revoke недоступен — не критично
      }
    };
  } catch (e) {
    // Worker/CSP недоступны (например, мобильный клиент) — обычный интервал.
    const id = setInterval(() => cb(), ms);
    return () => clearInterval(id);
  }
}
