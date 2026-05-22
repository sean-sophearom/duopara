// Shared constants — single source of truth for repeated values

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const GAME_TYPES = ['definition', 'translation', 'reverse', 'fillblank', 'matching', 'truefalse'] as const;
export type GameType = (typeof GAME_TYPES)[number];

export const VOCAB_STATUSES = ['learning', 'learned', 'mastered'] as const;
export type VocabStatus = (typeof VOCAB_STATUSES)[number];

export const CONTENT_STYLES = ['story', 'article', 'dialogue', 'description'] as const;
export type ContentStyle = (typeof CONTENT_STYLES)[number];

// Auth
export const BCRYPT_SALT_ROUNDS = 10;
export const JWT_EXPIRY = '7d';

// Pagination
export const DEFAULT_PAGE_LIMIT = 100;
export const DEFAULT_HISTORY_LIMIT = 20;

// Upload limits
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_WORDS = 10_000;
export const MAX_UPLOAD_DOC_SIZE = 15 * 1024 * 1024; // 15 MB for uploaded documents
export const MAX_UPLOAD_TEXT_CHARS = 50_000;

// Query limits
export const MAX_QUERY_LIMIT = 500;
export const MAX_HISTORY_DAYS = 365;

// Input constraints for LLM prompts
export const MAX_TOPIC_LENGTH = 200;
export const MAX_WORD_LENGTH = 100;
export const MAX_SENTENCE_LENGTH = 2000;
export const MAX_CONTEXT_LENGTH = 2000;

// Allowed languages (ISO 639-1 + common names)
export const ALLOWED_LANGUAGES = new Set([
  'arabic', 'bengali', 'bulgarian', 'catalan', 'chinese', 'croatian', 'czech',
  'danish', 'dutch', 'english', 'estonian', 'finnish', 'french', 'german',
  'greek', 'gujarati', 'hebrew', 'hindi', 'hungarian', 'icelandic', 'indonesian',
  'irish', 'italian', 'japanese', 'kannada', 'korean', 'latvian', 'lithuanian',
  'macedonian', 'malay', 'malayalam', 'maltese', 'marathi', 'norwegian',
  'persian', 'polish', 'portuguese', 'punjabi', 'romanian', 'russian',
  'serbian', 'sinhala', 'slovak', 'slovenian', 'spanish', 'swahili', 'swedish',
  'tagalog', 'tamil', 'telugu', 'thai', 'turkish', 'ukrainian', 'urdu',
  'vietnamese', 'welsh',
  // Common variants
  'mandarin', 'cantonese', 'brazilian portuguese', 'latin american spanish',
  'simplified chinese', 'traditional chinese',
]);

// Spaced repetition thresholds
export const STREAK_TO_LEARNED = 5;
export const STREAK_TO_MASTERED = 10;
export const MAX_REVIEW_INTERVAL_DAYS = 365;

// Difficulty guides for text generation
export const DIFFICULTY_GUIDES: Record<Difficulty, string> = {
  beginner:
    'Use simple present tense, basic vocabulary, short sentences (5-10 words). Avoid idioms, complex conjugations, or subjunctive mood.',
  intermediate:
    'Use varied tenses including past and future. Include some idiomatic expressions. Sentences can be 10-20 words. Use common conjugations.',
  advanced:
    'Use all tenses including subjunctive. Include idioms, complex sentence structures, and sophisticated vocabulary. Natural, native-like text.',
};

// Content style guides for text generation
export const STYLE_GUIDES: Record<ContentStyle, string> = {
  story: 'Write an engaging narrative story with characters and plot development.',
  article: 'Write an informative article or blog post style content.',
  dialogue: 'Write a realistic conversation between 2-3 people.',
  description: 'Write a vivid descriptive piece about a place, person, or event.',
};
