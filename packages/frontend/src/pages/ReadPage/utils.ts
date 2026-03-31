export const LANGUAGE_CODES: Record<string, string> = {
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Portuguese: "pt-BR",
  Japanese: "ja-JP",
  Korean: "ko-KR",
  Chinese: "zh-CN",
  Vietnamese: "vi-VN"
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

export function getStoredString(key: string, defaultValue: string): string {
  return localStorage.getItem(key) ?? defaultValue;
}

// Get the stored voice URI for a given language
export function getStoredVoiceURI(language: string): string | null {
  return localStorage.getItem(`duopara.voice.${language}`);
}

// Set the stored voice URI for a given language
export function setStoredVoiceURI(language: string, voiceURI: string): void {
  localStorage.setItem(`duopara.voice.${language}`, voiceURI);
}

// Get language code prefix for matching (e.g., "es" from "es-ES")
export function getLanguagePrefix(langCode: string): string {
  return langCode.split("-")[0].toLowerCase();
}

// Filter and sort voices for a language with fallbacks
export function getVoicesForLanguage(
  voices: SpeechSynthesisVoice[],
  language: string
): { primary: SpeechSynthesisVoice[]; fallback: SpeechSynthesisVoice[] } {
  const targetCode = LANGUAGE_CODES[language] || "es-ES";
  const targetPrefix = getLanguagePrefix(targetCode);

  // Primary: exact match or same language prefix
  const primary = voices.filter((v) => {
    const voicePrefix = getLanguagePrefix(v.lang);
    return voicePrefix === targetPrefix;
  });

  // Fallback: all other voices, sorted by language
  const fallback = voices.filter((v) => {
    const voicePrefix = getLanguagePrefix(v.lang);
    return voicePrefix !== targetPrefix;
  });

  return { primary, fallback };
}

// Format voice display name with language
export function formatVoiceName(voice: SpeechSynthesisVoice): string {
  const langName = voice.lang;
  return `${voice.name} (${langName})`;
}
