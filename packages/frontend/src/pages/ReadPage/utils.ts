export const LANGUAGE_CODES: Record<string, string> = {
  Spanish: 'es-ES',
  French: 'fr-FR',
  German: 'de-DE',
  Italian: 'it-IT',
  Portuguese: 'pt-BR',
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Chinese: 'zh-CN',
  Vietnamese: 'vi-VN',
};

export function getLanguageCode(lang: string): string {
  return LANGUAGE_CODES[lang] || 'es-ES';
}

export function cleanWord(word: string): string {
  return word.replace(/[^\p{L}'-]/gu, '').toLowerCase();
}

export function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  const stored = localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === 'true';
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

export function getStoredVoiceURI(language: string): string | null {
  return localStorage.getItem(`duopara.voice.${language}`);
}

export function setStoredVoiceURI(language: string, voiceURI: string): void {
  localStorage.setItem(`duopara.voice.${language}`, voiceURI);
}

export function getLanguagePrefix(langCode: string): string {
  return langCode.split('-')[0].toLowerCase();
}

export function getVoicesForLanguage(
  voices: SpeechSynthesisVoice[],
  language: string
): { primary: SpeechSynthesisVoice[]; fallback: SpeechSynthesisVoice[] } {
  const targetCode = LANGUAGE_CODES[language] || 'es-ES';
  const targetPrefix = getLanguagePrefix(targetCode);

  const primary = voices.filter((v) => {
    const voicePrefix = getLanguagePrefix(v.lang);
    return voicePrefix === targetPrefix;
  });

  const fallback = voices.filter((v) => {
    const voicePrefix = getLanguagePrefix(v.lang);
    return voicePrefix !== targetPrefix;
  });

  return { primary, fallback };
}

export function formatVoiceName(voice: SpeechSynthesisVoice): string {
  const langName = voice.lang;
  return `${voice.name} (${langName})`;
}
