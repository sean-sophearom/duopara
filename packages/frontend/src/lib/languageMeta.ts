export interface LanguageOption {
  code: string;
  name: string;
  nativeName?: string;
}

const languageFlags: Record<string, string> = {
  spanish: 'ES',
  vietnamese: 'VN',
  english: 'GB',
  french: 'FR',
  german: 'DE',
  italian: 'IT',
  portuguese: 'PT',
  russian: 'RU',
  japanese: 'JP',
  korean: 'KR',
  chinese: 'CN',
  arabic: 'SA',
  turkish: 'TR',
  dutch: 'NL',
  hindi: 'IN',
};

const languageShortCodes: Record<string, string> = {
  spanish: 'SP',
  vietnamese: 'VN',
  english: 'EN',
  french: 'FR',
  german: 'DE',
  italian: 'IT',
  portuguese: 'PT',
  russian: 'RU',
  japanese: 'JP',
  korean: 'KR',
  chinese: 'CN',
  arabic: 'AR',
  turkish: 'TR',
  dutch: 'NL',
  hindi: 'HI',
};

function toRegionalIndicatorPair(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function getLanguageFlag(languageCode: string) {
  const countryCode = languageFlags[languageCode.toLowerCase()];
  if (!countryCode) return '🌐';
  return toRegionalIndicatorPair(countryCode);
}

export function getLanguageShortCode(languageCode: string) {
  return languageShortCodes[languageCode.toLowerCase()] || languageCode.slice(0, 2).toUpperCase();
}

export function getNativeLanguageOptions(languages: LanguageOption[]) {
  const english = languages.find((lang) => lang.code.toLowerCase() === 'english');
  if (english) return [english];
  return [{ code: 'English', name: 'English', nativeName: 'English' }];
}
