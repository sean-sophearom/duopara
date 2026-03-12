import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { practiceApi, settingsApi, vocabularyApi } from '../lib/api';
import {
  GameType,
  VocabularyStatus,
  VocabularyWord,
  GameConfig,
  GAME_INFO,
  PracticeWord,
  SessionStats
} from '../games/types';
import {
  SessionResults,
  LoadingGame,
  DefinitionGame,
  TranslationGame,
  ReverseTranslationGame,
  FillBlankGame,
  MatchingGridGame,
  TrueFalseSwipeGame
} from '../games';
import {
  Gamepad2,
  BookOpen,
  GraduationCap,
  Trophy,
  Settings,
  Play,
  ChevronRight,
  AlertCircle,
  Loader2
} from 'lucide-react';

type ViewState = 'select' | 'config' | 'loading' | 'playing' | 'results';

export default function PracticePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  // State
  const [viewState, setViewState] = useState<ViewState>('select');
  // const [selectedStatuses, setSelectedStatuses] = useState<VocabularyStatus[]>(['learning', 'learned']);
  const [selectedStatuses, setSelectedStatuses] = useState<VocabularyStatus[]>(() => {
    const saved = localStorage.getItem('duopara.practice_selected_statuses');
    return saved ? JSON.parse(saved) : ['learning', 'learned'];
  });
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [wordCount, setWordCount] = useState(() => {
    const saved = localStorage.getItem('duopara.practice_word_count');
    return saved ? parseInt(saved) : 5;
  });
  const [gameConfig, setGameConfig] = useState<GameConfig>({});
  
  // Game state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    localStorage.setItem('duopara.practice_word_count', wordCount.toString());
  }, [wordCount]);

  useEffect(() => {
    localStorage.setItem('duopara.practice_selected_statuses', JSON.stringify(selectedStatuses));
  }, [selectedStatuses]);
  
  const sourceLanguage = user?.settings?.targetLanguage || 'Spanish';
  const targetLanguage = user?.settings?.nativeLanguage || 'English';
  
  // Fetch vocabulary stats
  const { data: vocabStats } = useQuery({
    queryKey: ['vocabulary', 'stats', sourceLanguage],
    queryFn: () => vocabularyApi.getStats(sourceLanguage).then(r => r.data),
  });
  
  // Fetch due words count
  const { data: dueData } = useQuery({
    queryKey: ['practice', 'due', sourceLanguage],
    queryFn: () => practiceApi.getDueCount(sourceLanguage).then(r => r.data),
  });
  
  // Mutations
  const getWordsMutation = useMutation({
    mutationFn: (data: Parameters<typeof practiceApi.getWords>[0]) =>
      practiceApi.getWords(data)
  });
  
  const getGameDataMutation = useMutation({
    mutationFn: (data: Parameters<typeof practiceApi.getGameDataBatch>[0]) =>
      practiceApi.getGameDataBatch(data)
  });
  
  const startSessionMutation = useMutation({
    mutationFn: (data: Parameters<typeof practiceApi.startSession>[0]) =>
      practiceApi.startSession(data)
  });
  
  const submitAttemptMutation = useMutation({
    mutationFn: (data: Parameters<typeof practiceApi.submitAttempt>[0]) =>
      practiceApi.submitAttempt(data)
  });
  
  const completeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => practiceApi.completeSession(sessionId)
  });


  
  // Get available word count for selected filters
  const availableWordCount = selectedStatuses.reduce((sum, status) => {
    if (!vocabStats) return sum;
    return sum + (vocabStats[status] || 0);
  }, 0);
  
  // Start game
  const handleStartGame = async () => {
    if (!selectedGame) return;
    
    setViewState('loading');
    setLoadingProgress(10);
    
    try {
      const isMatching = selectedGame === 'matching';
      // For matching, fetch extra words to ensure enough valid ones after filtering
      const fetchLimit = isMatching ? (gameConfig.pairCount || 4) + 3 : wordCount;

      // 1. Get words
      const wordsResponse = await getWordsMutation.mutateAsync({
        language: sourceLanguage,
        statuses: selectedStatuses,
        limit: fetchLimit,
        prioritizeSpacedRepetition: true
      });
      
      let words: VocabularyWord[] = wordsResponse.data.words;
      setLoadingProgress(30);
      
      if (words.length === 0) {
        alert('No words found matching your filters.');
        setViewState('select');
        return;
      }
      
      // 2. Load game data for words
      const gameDataResponse = await getGameDataMutation.mutateAsync({
        words: words.map(w => ({ 
          word: w.word, 
          translation: w.translation || '' 
        })),
        sourceLanguage,
        targetLanguage
      });
      
      setLoadingProgress(70);
      
      const results = gameDataResponse.data.results;

      // For matching, trim to the exact pairCount words that will actually be played,
      // so session.totalWords matches what the game submits and accuracy is correct.
      if (isMatching) {
        const pairCount = gameConfig.pairCount || 4;
        words = words
          .filter(w => results[w.word]?.data?.translation)
          .slice(0, pairCount);
      }
      
      // 3. Start session with the correct word set
      const sessionResponse = await startSessionMutation.mutateAsync({
        gameType: selectedGame,
        sourceLanguage,
        targetLanguage,
        wordIds: words.map(w => w.id),
        config: gameConfig
      });
      
      setSessionId(sessionResponse.data.session.id);
      setLoadingProgress(90);
      
      // 4. Combine words with game data
      const practiceWordsData: PracticeWord[] = words.map(w => ({
        vocabularyWord: w,
        gameData: results[w.word]?.data || null,
        loading: false,
        error: results[w.word]?.error
      }));
      
      setPracticeWords(practiceWordsData);
      setLoadingProgress(100);
      
      // Start playing
      setViewState('playing');
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game. Please try again.');
      setViewState('select');
    }
  };
  
  // Handle attempt submission
  const handleAttempt = async (attempt: {
    vocabularyWordId: string;
    isCorrect: boolean;
    questionData: any;
    userAnswer: string;
    correctAnswer: string;
  }) => {
    if (!sessionId) return;
    
    try {
      await submitAttemptMutation.mutateAsync({
        sessionId,
        ...attempt
      });
    } catch (error) {
      console.error('Failed to submit attempt:', error);
    }
  };
  
  // Handle game completion
  const handleComplete = async () => {
    if (!sessionId) return;
    
    try {
      const response = await completeSessionMutation.mutateAsync(sessionId);
      setSessionStats(response.data.stats);
      setViewState('results');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
      queryClient.invalidateQueries({ queryKey: ['practice'] });
    } catch (error) {
      console.error('Failed to complete session:', error);
      setViewState('select');
    }
  };
  
  // Play again
  const handlePlayAgain = () => {
    setSessionId(null);
    setPracticeWords([]);
    setSessionStats(null);
    handleStartGame();
  };
  
  // Back to selection
  const handleBackToSelect = () => {
    setViewState('select');
    setSelectedGame(null);
    setSessionId(null);
    setPracticeWords([]);
    setSessionStats(null);
  };
  
  // Select game and go to config
  const handleSelectGame = (gameType: GameType) => {
    setSelectedGame(gameType);
    setGameConfig(GAME_INFO[gameType].defaultConfig);
    setViewState('config');
  };
  
  // Render game selection view
  const renderSelection = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Practice Vocabulary</h1>
        <p className="text-gray-600">Choose a game to practice your words</p>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-600" />
          <div className="text-2xl font-bold text-blue-900">{vocabStats?.learning || 0}</div>
          <div className="text-sm text-blue-600">Learning</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <GraduationCap className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <div className="text-2xl font-bold text-green-900">{vocabStats?.learned || 0}</div>
          <div className="text-sm text-green-600">Learned</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-600" />
          <div className="text-2xl font-bold text-purple-900">{vocabStats?.mastered || 0}</div>
          <div className="text-sm text-purple-600">Mastered</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-orange-600" />
          <div className="text-2xl font-bold text-orange-900">{dueData?.dueCount || 0}</div>
          <div className="text-sm text-orange-600">Due for Review</div>
        </div>
      </div>
      
      {/* Filter by status */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Practice words that are:</h3>
        <div className="flex flex-wrap gap-2">
          {(['learning', 'learned', 'mastered'] as VocabularyStatus[]).map(status => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatuses(prev => 
                  prev.includes(status)
                    ? prev.filter(s => s !== status)
                    : [...prev, status]
                );
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedStatuses.includes(status)
                  ? status === 'learning' ? 'bg-blue-600 text-white'
                  : status === 'learned' ? 'bg-green-600 text-white'
                  : 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {availableWordCount} words available
        </p>
      </div>
      
      {/* Word count selector */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Number of words:</h3>
        <div className="grid grid-cols-2 sm:flex gap-2">
          {[5, 10, 15, 20, 30].map(count => (
            <button
              key={count}
              onClick={() => setWordCount(count)}
              disabled={count > availableWordCount || count >= 15}
              className={`px-4 py-2 rounded-lg transition-colors ${
                wordCount === count
                  ? 'bg-blue-600 text-white'
                  : count > availableWordCount || count >= 15
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>
      
      {/* Game cards */}
      <h3 className="font-medium text-gray-900 mb-4">Choose a game:</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(Object.values(GAME_INFO) as typeof GAME_INFO[GameType][]).map(game => (
          <button
            key={game.type}
            onClick={() => handleSelectGame(game.type)}
            disabled={availableWordCount < game.minWords}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              availableWordCount < game.minWords
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg'
            }`}
          >
            <div className="text-3xl mb-3">{game.icon}</div>
            <h4 className="font-semibold text-gray-900 mb-1">{game.name}</h4>
            <p className="text-sm text-gray-600">{game.description}</p>
            {availableWordCount < game.minWords && (
              <p className="text-xs text-red-500 mt-2">
                Requires at least {game.minWords} words
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
  
  // Render config view
  const renderConfig = () => {
    if (!selectedGame) return null;
    const game = GAME_INFO[selectedGame];
    
    return (
      <div className="max-w-md mx-auto p-6 flex-1 flex flex-col">
        <button
          onClick={() => setViewState('select')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          Back
        </button>
        
        <div className="bg-white rounded-xl border p-6 my-auto">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{game.icon}</div>
            <h2 className="text-2xl font-bold text-gray-900">{game.name}</h2>
            <p className="text-gray-600 mt-1">{game.description}</p>
          </div>
          
          {/* Game-specific options */}
          {game.configOptions && (
            <div className="space-y-4 mb-6">
              {game.configOptions.optionCount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {game.configOptions.optionCount.label}
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    {Array.from(
                      { length: game.configOptions.optionCount.max - game.configOptions.optionCount.min + 1 },
                      (_, i) => game.configOptions!.optionCount!.min + i
                    ).map(n => (
                      <button
                        key={n}
                        onClick={() => setGameConfig(c => ({ ...c, optionCount: n }))}
                        className={`flex-1 py-2 rounded-lg transition-colors ${
                          (gameConfig.optionCount || game.configOptions!.optionCount!.default) === n
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {game.configOptions.pairCount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {game.configOptions.pairCount.label}
                  </label>
                  <div className="flex gap-2">
                    {Array.from(
                      { length: game.configOptions.pairCount.max - game.configOptions.pairCount.min + 1 },
                      (_, i) => game.configOptions!.pairCount!.min + i
                    ).map(n => (
                      <button
                        key={n}
                        onClick={() => setGameConfig(c => ({ ...c, pairCount: n }))}
                        disabled={n > availableWordCount}
                        className={`flex-1 py-2 rounded-lg transition-colors ${
                          (gameConfig.pairCount || game.configOptions!.pairCount!.default) === n
                            ? 'bg-blue-600 text-white'
                            : n > availableWordCount
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Words</span>
              <span className="font-medium">{wordCount}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Source</span>
              <span className="font-medium">{sourceLanguage}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Target</span>
              <span className="font-medium">{targetLanguage}</span>
            </div>
          </div>
          
          <button
            onClick={handleStartGame}
            className="w-full py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start Game
          </button>
        </div>
      </div>
    );
  };
  
  // Render loading view
  const renderLoading = () => (
    <LoadingGame 
      message="Preparing your practice session..." 
      progress={loadingProgress}
    />
  );
  
  // Render game
  const renderGame = () => {
    if (!selectedGame || practiceWords.length === 0) return null;
    
    const gameProps = {
      words: practiceWords,
      sourceLanguage,
      targetLanguage,
      config: gameConfig,
      onAttempt: handleAttempt,
      onComplete: handleComplete
    };
    
    switch (selectedGame) {
      case 'definition':
        return <DefinitionGame {...gameProps} />;
      case 'translation':
        return <TranslationGame {...gameProps} />;
      case 'reverse':
        return <ReverseTranslationGame {...gameProps} />;
      case 'fillblank':
        return <FillBlankGame {...gameProps} />;
      case 'matching':
        return <MatchingGridGame {...gameProps} />;
      case 'truefalse':
        return <TrueFalseSwipeGame {...gameProps} />;
      default:
        return null;
    }
  };
  
  // Render results
  const renderResults = () => {
    if (!sessionStats || !selectedGame) return null;
    
    const game = GAME_INFO[selectedGame];
    
    return (
      <SessionResults
        stats={sessionStats}
        gameIcon={game.icon}
        gameName={game.name}
        onPlayAgain={handlePlayAgain}
        onExit={handleBackToSelect}
      />
    );
  };
  
  // Main render
  switch (viewState) {
    case 'select':
      return renderSelection();
    case 'config':
      return renderConfig();
    case 'loading':
      return renderLoading();
    case 'playing':
      return renderGame();
    case 'results':
      return renderResults();
    default:
      return renderSelection();
  }
}
