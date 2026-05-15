export class StorageWriteError extends Error {
  constructor(key: string, cause: unknown) {
    super(`Failed to save local data for key "${key}"`);
    this.name = "StorageWriteError";
    Object.defineProperty(this, "cause", {
      value: cause,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    throw new StorageWriteError(key, error);
  }
}
