import axios from 'axios';

const VITE_BASE_PATH = import.meta.env.VITE_BASE_PATH || '/';
const apiBaseURL = VITE_BASE_PATH !== '/' ? `${VITE_BASE_PATH}/api` : '/api';

export const api = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name?: string) =>
    api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

export const vocabularyApi = {
  getAll: (params?: { language?: string; status?: string; search?: string; limit?: number; offset?: number }) =>
    api.get('/vocabulary', { params }),
  getStats: (language?: string) =>
    api.get('/vocabulary/stats', { params: { language } }),
  getKnown: (language: string) =>
    api.get('/vocabulary/known', { params: { language } }),
  add: (data: { word: string; language: string; translation?: string; partOfSpeech?: string; status?: string }) =>
    api.post('/vocabulary', data),
  update: (id: string, data: { status?: string; translation?: string }) =>
    api.patch(`/vocabulary/${id}`, data),
  markLearned: (word: string, language: string) =>
    api.post('/vocabulary/mark-learned', { word, language }),
  markLearning: (word: string, language: string) =>
    api.post('/vocabulary/mark-learning', { word, language }),
  delete: (id: string) => api.delete(`/vocabulary/${id}`),
  import: (file: File, language: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    return api.post('/vocabulary/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  export: (language?: string) =>
    api.get('/vocabulary/export', { params: { language }, responseType: 'blob' }),
};

export const generateApi = {
  randomTopic: (language: string, difficulty: string) =>
    api.get<{ topic: string }>('/generate/random-topic', { params: { language, difficulty } }),
  create: (data: {
    topic?: string;
    customText?: string;
    title?: string;
    language: string;
    difficulty?: string;
    knownWordsRatio?: number;
    wordCount?: number;
    style?: string;
    includeLearningWords?: boolean;
    includeLearnedWords?: boolean;
  }) => api.post('/generate', data),
  regenerate: (textId: string, action: 'simplify' | 'harder') =>
    api.post('/generate/regenerate', { textId, action }),
};

export const textsApi = {
  getAll: (params?: { language?: string; limit?: number; offset?: number; search?: string }) =>
    api.get('/texts', { params }),
  getOne: (id: string) => api.get(`/texts/${id}`),
  startSession: (textId: string) => api.post(`/texts/${textId}/start-session`),
  updateSession: (sessionId: string, data: { wordsLookedUp?: string[]; wordsMarkedLearned?: string[]; completed?: boolean }) =>
    api.patch(`/texts/session/${sessionId}`, data),
  delete: (id: string) => api.delete(`/texts/${id}`),
  translateAll: (id: string, targetLanguage: string) =>
    api.post(`/texts/${id}/translate`, { targetLanguage }),
  enhancedTranslate: (id: string, targetLanguage: string) =>
    api.post(`/texts/${id}/enhanced-translate`, { targetLanguage }),
};

export const translateApi = {
  word: (data: { word: string; sourceLanguage: string; targetLanguage: string; context?: string }) =>
    api.post('/translate/word', data),
  sentence: (data: { sentence: string; sourceLanguage: string; targetLanguage: string; includeGrammarHints?: boolean }) =>
    api.post('/translate/sentence', data),
  analyze: (data: { word: string; language: string; context?: string }) =>
    api.post('/translate/analyze', data),
  full: (data: { word: string; sourceLanguage: string; targetLanguage: string; context?: string }) =>
    api.post('/translate/full', data),
};

export const statsApi = {
  get: (language?: string) => api.get('/stats', { params: { language } }),
  heatmap: () => api.get('/stats/heatmap'),
  progress: (days?: number) => api.get('/stats/progress', { params: { days } }),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: { targetLanguage?: string; nativeLanguage?: string; knownWordsRatio?: number; defaultDifficulty?: string }) =>
    api.patch('/settings', data),
  getLanguages: () => api.get('/settings/languages'),
};

export const practiceApi = {
  getWords: (data: {
    language: string;
    statuses: ('learning' | 'learned' | 'mastered')[];
    limit?: number;
    prioritizeSpacedRepetition?: boolean;
  }) => api.post('/practice/words', data),

  getGameData: (data: {
    word: string;
    sourceLanguage: string;
    targetLanguage: string;
    translation?: string;
  }) => api.post('/practice/game-data', data),

  getGameDataBatch: (data: {
    words: Array<{ word: string; translation: string }>;
    sourceLanguage: string;
    targetLanguage: string;
  }) => api.post('/practice/game-data/batch', data),

  startSession: (data: {
    gameType: 'definition' | 'translation' | 'reverse' | 'fillblank' | 'matching' | 'truefalse';
    sourceLanguage: string;
    targetLanguage: string;
    wordIds: string[];
    config?: {
      optionCount?: number;
      pairCount?: number;
    };
  }) => api.post('/practice/session/start', data),

  submitAttempt: (data: {
    sessionId: string;
    vocabularyWordId: string;
    isCorrect: boolean;
    responseTimeMs?: number;
    questionData: any;
    userAnswer: string;
    correctAnswer: string;
  }) => api.post('/practice/attempt', data),

  completeSession: (sessionId: string) =>
    api.post('/practice/session/complete', { sessionId }),

  getStats: (params?: { language?: string; days?: number }) =>
    api.get('/practice/stats', { params }),

  getDueCount: (language?: string) =>
    api.get('/practice/due', { params: { language } }),
};
