import axios from 'axios';

//@ts-expect-error
const VITE_BASE_PATH = import.meta.env.VITE_BASE_PATH || '/';
// If VITE_BASE_PATH is set and not just "/", we need to adjust the baseURL for API calls
const apiBaseURL = VITE_BASE_PATH !== '/' ? `${VITE_BASE_PATH}/api` : '/api';

export const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - could trigger logout here
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// API functions for each endpoint
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
  create: (data: {
    topic: string;
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
  // Get words for practice session
  getWords: (data: {
    language: string;
    statuses: ('learning' | 'learned' | 'mastered')[];
    limit?: number;
    prioritizeSpacedRepetition?: boolean;
  }) => api.post('/practice/words', data),
  
  // Get game data for a single word
  getGameData: (data: {
    word: string;
    sourceLanguage: string;
    targetLanguage: string;
    translation?: string;
  }) => api.post('/practice/game-data', data),
  
  // Batch get game data for multiple words
  getGameDataBatch: (data: {
    words: Array<{ word: string; translation: string }>;
    sourceLanguage: string;
    targetLanguage: string;
  }) => api.post('/practice/game-data/batch', data),
  
  // Start a new practice session
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
  
  // Submit a practice attempt
  submitAttempt: (data: {
    sessionId: string;
    vocabularyWordId: string;
    isCorrect: boolean;
    responseTimeMs?: number;
    questionData: any;
    userAnswer: string;
    correctAnswer: string;
  }) => api.post('/practice/attempt', data),
  
  // Complete a practice session
  completeSession: (sessionId: string) => 
    api.post('/practice/session/complete', { sessionId }),
  
  // Get practice statistics
  getStats: (params?: { language?: string; days?: number }) =>
    api.get('/practice/stats', { params }),
  
  // Get count of words due for review
  getDueCount: (language?: string) =>
    api.get('/practice/due', { params: { language } }),
};
