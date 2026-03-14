export const LANGUAGE_CODES: Record<string, string> = {
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Portuguese: "pt-BR",
  Japanese: "ja-JP",
  Korean: "ko-KR",
  Chinese: "zh-CN",
};

export function getLanguageCode(lang: string): string {
  return LANGUAGE_CODES[lang] || "es-ES";
}

export function cleanWord(word: string): string {
  return word.replace(/[^\p{L}'-]/gu, "").toLowerCase();
}

export function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === "true";
}

export function getStoredNumber(key: string, defaultValue: number): number {
  const stored = localStorage.getItem(key);
  return stored ? parseFloat(stored) : defaultValue;
}

export function setStoredValue(key: string, value: string | number | boolean): void {
  localStorage.setItem(key, String(value));
}
