export interface PresetWord {
  word: string;
  translation: string;
  partOfSpeech: string;
  baseForm?: string;
}

export interface VocabularyPresetPack {
  id: string;
  language: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate';
  category: string;
  words: PresetWord[];
}

export const vocabularyPresetPacks: VocabularyPresetPack[] = [
  {
    id: 'spanish-core-verbs',
    language: 'Spanish',
    title: 'Core Verbs',
    description: 'High-frequency actions that unlock simple sentences.',
    level: 'beginner',
    category: 'Verbs',
    words: [
      { word: 'ser', translation: 'to be', partOfSpeech: 'verb' },
      { word: 'estar', translation: 'to be', partOfSpeech: 'verb' },
      { word: 'tener', translation: 'to have', partOfSpeech: 'verb' },
      { word: 'hacer', translation: 'to do, to make', partOfSpeech: 'verb' },
      { word: 'ir', translation: 'to go', partOfSpeech: 'verb' },
      { word: 'venir', translation: 'to come', partOfSpeech: 'verb' },
      { word: 'querer', translation: 'to want', partOfSpeech: 'verb' },
      { word: 'poder', translation: 'to be able to', partOfSpeech: 'verb' },
      { word: 'saber', translation: 'to know', partOfSpeech: 'verb' },
      { word: 'ver', translation: 'to see', partOfSpeech: 'verb' },
      { word: 'decir', translation: 'to say', partOfSpeech: 'verb' },
      { word: 'comer', translation: 'to eat', partOfSpeech: 'verb' },
    ],
  },
  {
    id: 'spanish-everyday-nouns',
    language: 'Spanish',
    title: 'Everyday Nouns',
    description: 'Common people, places, and things for daily reading.',
    level: 'beginner',
    category: 'Nouns',
    words: [
      { word: 'persona', translation: 'person', partOfSpeech: 'noun' },
      { word: 'casa', translation: 'house', partOfSpeech: 'noun' },
      { word: 'trabajo', translation: 'work, job', partOfSpeech: 'noun' },
      { word: 'tiempo', translation: 'time, weather', partOfSpeech: 'noun' },
      { word: 'día', translation: 'day', partOfSpeech: 'noun' },
      { word: 'noche', translation: 'night', partOfSpeech: 'noun' },
      { word: 'comida', translation: 'food, meal', partOfSpeech: 'noun' },
      { word: 'agua', translation: 'water', partOfSpeech: 'noun' },
      { word: 'ciudad', translation: 'city', partOfSpeech: 'noun' },
      { word: 'familia', translation: 'family', partOfSpeech: 'noun' },
      { word: 'amigo', translation: 'friend', partOfSpeech: 'noun' },
      { word: 'escuela', translation: 'school', partOfSpeech: 'noun' },
    ],
  },
  {
    id: 'spanish-connectors',
    language: 'Spanish',
    title: 'Connectors',
    description: 'Small words that make sentences flow naturally.',
    level: 'beginner',
    category: 'Function words',
    words: [
      { word: 'y', translation: 'and', partOfSpeech: 'conjunction' },
      { word: 'pero', translation: 'but', partOfSpeech: 'conjunction' },
      { word: 'porque', translation: 'because', partOfSpeech: 'conjunction' },
      { word: 'también', translation: 'also', partOfSpeech: 'adverb' },
      { word: 'entonces', translation: 'then, so', partOfSpeech: 'adverb' },
      { word: 'después', translation: 'after, later', partOfSpeech: 'adverb' },
      { word: 'antes', translation: 'before', partOfSpeech: 'adverb' },
      { word: 'con', translation: 'with', partOfSpeech: 'preposition' },
      { word: 'sin', translation: 'without', partOfSpeech: 'preposition' },
      { word: 'para', translation: 'for, in order to', partOfSpeech: 'preposition' },
      { word: 'sobre', translation: 'about, on top of', partOfSpeech: 'preposition' },
      { word: 'cuando', translation: 'when', partOfSpeech: 'adverb' },
    ],
  },
  {
    id: 'vietnamese-core-verbs',
    language: 'Vietnamese',
    title: 'Core Verbs',
    description: 'Useful actions for short daily sentences.',
    level: 'beginner',
    category: 'Verbs',
    words: [
      { word: 'là', translation: 'to be', partOfSpeech: 'verb' },
      { word: 'có', translation: 'to have', partOfSpeech: 'verb' },
      { word: 'làm', translation: 'to do, to make', partOfSpeech: 'verb' },
      { word: 'đi', translation: 'to go', partOfSpeech: 'verb' },
      { word: 'đến', translation: 'to arrive, to come', partOfSpeech: 'verb' },
      { word: 'muốn', translation: 'to want', partOfSpeech: 'verb' },
      { word: 'biết', translation: 'to know', partOfSpeech: 'verb' },
      { word: 'thấy', translation: 'to see', partOfSpeech: 'verb' },
      { word: 'nói', translation: 'to speak, to say', partOfSpeech: 'verb' },
      { word: 'ăn', translation: 'to eat', partOfSpeech: 'verb' },
      { word: 'uống', translation: 'to drink', partOfSpeech: 'verb' },
      { word: 'học', translation: 'to study, to learn', partOfSpeech: 'verb' },
    ],
  },
  {
    id: 'vietnamese-everyday-nouns',
    language: 'Vietnamese',
    title: 'Everyday Nouns',
    description: 'Common objects and people for beginner reading.',
    level: 'beginner',
    category: 'Nouns',
    words: [
      { word: 'người', translation: 'person', partOfSpeech: 'noun' },
      { word: 'nhà', translation: 'house, home', partOfSpeech: 'noun' },
      { word: 'công việc', translation: 'work, job', partOfSpeech: 'noun' },
      { word: 'thời gian', translation: 'time', partOfSpeech: 'noun' },
      { word: 'ngày', translation: 'day', partOfSpeech: 'noun' },
      { word: 'đêm', translation: 'night', partOfSpeech: 'noun' },
      { word: 'đồ ăn', translation: 'food', partOfSpeech: 'noun' },
      { word: 'nước', translation: 'water', partOfSpeech: 'noun' },
      { word: 'thành phố', translation: 'city', partOfSpeech: 'noun' },
      { word: 'gia đình', translation: 'family', partOfSpeech: 'noun' },
      { word: 'bạn', translation: 'friend', partOfSpeech: 'noun' },
      { word: 'trường học', translation: 'school', partOfSpeech: 'noun' },
    ],
  },
  {
    id: 'vietnamese-connectors',
    language: 'Vietnamese',
    title: 'Connectors',
    description: 'Short linking words for smoother sentences.',
    level: 'beginner',
    category: 'Function words',
    words: [
      { word: 'và', translation: 'and', partOfSpeech: 'conjunction' },
      { word: 'nhưng', translation: 'but', partOfSpeech: 'conjunction' },
      { word: 'vì', translation: 'because', partOfSpeech: 'conjunction' },
      { word: 'cũng', translation: 'also', partOfSpeech: 'adverb' },
      { word: 'sau đó', translation: 'after that', partOfSpeech: 'adverb' },
      { word: 'trước', translation: 'before', partOfSpeech: 'adverb' },
      { word: 'với', translation: 'with', partOfSpeech: 'preposition' },
      { word: 'không có', translation: 'without', partOfSpeech: 'phrase' },
      { word: 'cho', translation: 'for, to', partOfSpeech: 'preposition' },
      { word: 'về', translation: 'about', partOfSpeech: 'preposition' },
      { word: 'khi', translation: 'when', partOfSpeech: 'conjunction' },
      { word: 'nếu', translation: 'if', partOfSpeech: 'conjunction' },
    ],
  },
];

export function getPresetPacks(language?: string) {
  return vocabularyPresetPacks.filter((pack) => !language || pack.language === language);
}

export function getPresetPack(packId: string) {
  return vocabularyPresetPacks.find((pack) => pack.id === packId);
}
