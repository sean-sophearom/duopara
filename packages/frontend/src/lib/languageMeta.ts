export interface LanguageOption {
  code: string;
  name: string;
  nativeName?: string;
}

export interface LanguageOptionsResponse {
  languages: LanguageOption[];
  nativeLanguages?: LanguageOption[];
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
  polish: 'PL',
  swedish: 'SE',
  norwegian: 'NO',
  danish: 'DK',
  finnish: 'FI',
  greek: 'GR',
  hebrew: 'IL',
  khmer: 'KH',
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
  polish: 'PL',
  swedish: 'SV',
  norwegian: 'NO',
  danish: 'DA',
  finnish: 'FI',
  greek: 'EL',
  hebrew: 'HE',
  khmer: 'KM',
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

export function getNativeLanguageOptions(
  languages: LanguageOption[],
  nativeLanguages?: LanguageOption[]
) {
  if (nativeLanguages && nativeLanguages.length > 0) return nativeLanguages;
  if (languages.length > 0) return languages;
  return [{ code: 'English', name: 'English', nativeName: 'English' }];
}
