import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateApi, settingsApi, vocabularyApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  Sparkles,
  Loader2,
  BookOpen,
  Lightbulb,
  Coffee,
  Plane,
  ShoppingBag,
  Utensils,
  Heart,
  Briefcase,
  GraduationCap,
  Newspaper
} from 'lucide-react';

const topicSuggestions = [
  { icon: Coffee, label: 'Ordering at a café', topic: 'Ordering coffee and pastries at a local café' },
  { icon: Plane, label: 'At the airport', topic: 'Navigating an airport and catching a flight' },
  { icon: ShoppingBag, label: 'Shopping for clothes', topic: 'Shopping for clothes at a store' },
  { icon: Utensils, label: 'Restaurant conversation', topic: 'Having dinner at a restaurant' },
  { icon: Heart, label: 'Making friends', topic: 'Meeting new people and making friends' },
  { icon: Briefcase, label: 'Job interview', topic: 'A job interview scenario' },
  { icon: GraduationCap, label: 'At university', topic: 'First day at a foreign university' },
  { icon: Newspaper, label: 'Daily news', topic: 'Reading about current events' },
];

const styleOptions = [
  { value: 'story', label: 'Story', description: 'Narrative with characters' },
  { value: 'dialogue', label: 'Dialogue', description: 'Conversation format' },
  { value: 'article', label: 'Article', description: 'Informative style' },
  { value: 'description', label: 'Description', description: 'Vivid descriptions' },
];

const difficultyOptions = [
  { value: 'beginner', label: 'Beginner', description: 'Simple vocabulary & grammar' },
  { value: 'intermediate', label: 'Intermediate', description: 'Varied structures' },
  { value: 'advanced', label: 'Advanced', description: 'Complex & idiomatic' },
];

export default function GeneratePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const defaultLanguage = user?.settings?.targetLanguage || 'Spanish';
  const defaultRatio = user?.settings?.knownWordsRatio || 80;
  const defaultDifficulty = user?.settings?.defaultDifficulty || 'intermediate';

  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState(defaultLanguage);
  const [difficulty, setDifficulty] = useState(defaultDifficulty);
  const [knownWordsRatio, setKnownWordsRatio] = useState(defaultRatio);
  const [wordCount, setWordCount] = useState(200);
  const [style, setStyle] = useState('story');

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
  });

  const { data: vocabStats } = useQuery({
    queryKey: ['vocabulary', 'stats', language],
    queryFn: () => vocabularyApi.getStats(language).then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: generateApi.create,
    onSuccess: (response) => {
      navigate(`/read/${response.data.text.id}`);
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    generateMutation.mutate({
      topic: topic.trim(),
      language,
      difficulty,
      knownWordsRatio,
      wordCount,
      style,
    });
  };

  const handleTopicSuggestion = (suggestedTopic: string) => {
    setTopic(suggestedTopic);
  };

  const knownWords = (vocabStats?.learned || 0) + (vocabStats?.mastered || 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Generate Reading Material</h1>
        <p className="text-gray-600 mt-1">
          Create personalized content based on your vocabulary level
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-8">
        {/* Topic input */}
        <div className="card p-6">
          <label className="block text-lg font-semibold text-gray-900 mb-3">
            What would you like to read about?
          </label>
          <div className="relative">
            <Lightbulb className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. A day at the beach, Cooking traditional food, Space exploration..."
              className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              required
            />
          </div>

          {/* Topic suggestions */}
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Or try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {topicSuggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => handleTopicSuggestion(suggestion.topic)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
                >
                  <suggestion.icon className="w-4 h-4" />
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Language and difficulty */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Target Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input text-lg"
            >
              {languages?.map((lang: any) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              )) || (
                <option value="Spanish">Spanish (Español)</option>
              )}
            </select>
            
            <div className="mt-4 p-3 bg-primary-50 rounded-lg">
              <p className="text-sm text-primary-700">
                <BookOpen className="w-4 h-4 inline mr-1" />
                You have <strong>{knownWords}</strong> known words in {language}
              </p>
            </div>
          </div>

          <div className="card p-6">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Difficulty Level
            </label>
            <div className="space-y-2">
              {difficultyOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    difficulty === opt.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={opt.value}
                    checked={difficulty === opt.value}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    difficulty === opt.value ? 'border-primary-600' : 'border-gray-300'
                  }`}>
                    {difficulty === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-primary-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced options */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fine-tune your text</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Known words ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vocabulary Mix
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={knownWordsRatio}
                  onChange={(e) => setKnownWordsRatio(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 w-24 text-right">
                  {knownWordsRatio}% known
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {100 - knownWordsRatio}% new words to challenge you
              </p>
            </div>

            {/* Word count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approximate Length
              </label>
              <select
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                className="input"
              >
                <option value={100}>Short (~100 words)</option>
                <option value={200}>Medium (~200 words)</option>
                <option value={350}>Long (~350 words)</option>
                <option value={500}>Very long (~500 words)</option>
              </select>
            </div>
          </div>

          {/* Style */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Writing Style
            </label>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
              {styleOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all text-center ${
                    style === opt.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="style"
                    value={opt.value}
                    checked={style === opt.value}
                    onChange={(e) => setStyle(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-medium text-gray-900">{opt.label}</span>
                  <span className="text-xs text-gray-500">{opt.description}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button
          type="submit"
          disabled={generateMutation.isPending || !topic.trim()}
          className="btn btn-primary w-full py-4 text-lg"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Generating your text...
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6 mr-2" />
              Generate Text
            </>
          )}
        </button>

        {generateMutation.isError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            Failed to generate text. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}
