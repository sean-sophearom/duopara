import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { textsApi, translateApi, vocabularyApi, generateApi } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import {
  ChevronLeft,
  Volume2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  BookOpen,
  Sparkles,
  X,
  Languages,
  Eye,
  EyeOff,
  Play,
  Square,
} from "lucide-react";

interface WordInfo {
  word: string;
  translation: string;
  alternativeTranslations?: string[];
  partOfSpeech?: string;
  baseForm?: string;
  conjugation?: { tense?: string; person?: string; mood?: string };
  contextualNote?: string;
  gender?: string;
}

interface SentenceInfo {
  sentence: string;
  translation: string;
  grammarNotes?: { element: string; explanation: string }[];
  literalTranslation?: string;
}

export default function ReadPage() {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [sentenceInfo, setSentenceInfo] = useState<SentenceInfo | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());
  const [markedLearningWords, setMarkedLearningWords] = useState<Set<string>>(new Set());
  const [showSidebar, setShowSidebar] = useState(true);
  const [showParallelTranslation, setShowParallelTranslation] = useState(false);
  
  // Session tracking
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wordsLookedUpRef = useRef<Set<string>>(new Set());
  const sessionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hoveredWord, setHoveredWord] = useState<{
    word: string;
    sentence: string;
    target: HTMLElement;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [useLiteralTranslation, setUseLiteralTranslation] = useState(
    () => localStorage.getItem("duopara.useLiteralTranslation") === "true",
  );
  const [parallelTranslations, setParallelTranslations] = useState<
    Array<{ translation: string; literalTranslation?: string } | null>
  >([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [speechRate, setSpeechRateState] = useState<number>(() => {
    const stored = localStorage.getItem("duopara.speechRate");
    return stored ? parseFloat(stored) : 0.9;
  });

  const speechRateRef = useRef(speechRate);

  const contentRef = useRef<HTMLDivElement>(null);

  const setSpeechRate = (rate: number) => {
    const clamped = Math.round(rate * 100) / 100;
    setSpeechRateState(clamped);
    speechRateRef.current = clamped;
    localStorage.setItem("duopara.speechRate", String(clamped));
  };

  // Keep ref in sync (covers external state updates)
  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  useEffect(() => {
    localStorage.setItem(
      "duopara.useLiteralTranslation",
      String(useLiteralTranslation),
    );
  }, [useLiteralTranslation]);

  const nativeLanguage = user?.settings?.nativeLanguage || "English";

  const { data, isLoading, error } = useQuery({
    queryKey: ["text", textId],
    queryFn: () => textsApi.getOne(textId!).then((r) => r.data),
    enabled: !!textId,
  });

  const text = data?.text;
  const knownWordsSet = new Set(
    (text?.knownWordsUsed || []).map((w: string) => w.toLowerCase()),
  );
  const newWordsSet = new Set(
    (text?.newWordsIntroduced || []).map((w: string) => w.toLowerCase()),
  );

  const { data: learningVocabData } = useQuery({
    queryKey: ["vocabulary", "learning", text?.language],
    queryFn: () =>
      vocabularyApi
        .getAll({ language: text?.language, status: "learning", limit: 1000 })
        .then((r) => r.data),
    enabled: !!text?.language,
  });

  useEffect(() => {
    if (learningVocabData?.words) {
      setMarkedLearningWords(
        new Set(
          learningVocabData.words.map((w: { word: string }) =>
            w.word.toLowerCase(),
          ),
        ),
      );
    }
  }, [learningVocabData]);

  // Initialize or resume session when text loads
  useEffect(() => {
    if (!text || !textId) return;
    
    // Check for existing incomplete session or the most recent one
    const existingSessions = text.readingSessions || [];
    const recentSession = existingSessions[0]; // Already sorted by startedAt desc
    
    if (recentSession && !recentSession.completedAt) {
      // Resume existing incomplete session
      setSessionId(recentSession.id);
      // Initialize markedWords from session data
      const learnedInSession = recentSession.wordsMarkedLearned || [];
      setMarkedWords(new Set(learnedInSession.map((w: string) => w.toLowerCase())));
      // Initialize looked up words ref
      wordsLookedUpRef.current = new Set(recentSession.wordsLookedUp || []);
    } else {
      // Start a new session
      textsApi.startSession(textId).then((response) => {
        setSessionId(response.data.session.id);
        setMarkedWords(new Set());
        wordsLookedUpRef.current = new Set();
      }).catch(console.error);
    }
  }, [text, textId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionUpdateTimeoutRef.current) {
        clearTimeout(sessionUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Function to update session with debouncing
  const updateSession = useCallback((updates: { wordsLookedUp?: string[]; wordsMarkedLearned?: string[] }) => {
    if (!sessionId) return;
    
    // Clear any pending update
    if (sessionUpdateTimeoutRef.current) {
      clearTimeout(sessionUpdateTimeoutRef.current);
    }
    
    // Debounce the update to avoid too many API calls
    sessionUpdateTimeoutRef.current = setTimeout(() => {
      textsApi.updateSession(sessionId, updates).catch(console.error);
    }, 500);
  }, [sessionId]);

  // Regenerate mutations
  const simplifyMutation = useMutation({
    mutationFn: () => generateApi.regenerate(textId!, "simplify"),
    onSuccess: (response) => {
      navigate(`/read/${response.data.text.id}`);
    },
  });

  const harderMutation = useMutation({
    mutationFn: () => generateApi.regenerate(textId!, "harder"),
    onSuccess: (response) => {
      navigate(`/read/${response.data.text.id}`);
    },
  });

  // Mark word as learning
  const markLearningMutation = useMutation({
    mutationFn: (word: string) =>
      vocabularyApi.markLearning(word, text?.language || "Spanish"),
    onSuccess: (_, word) => {
      const normalizedWord = word.toLowerCase();
      setMarkedLearningWords((prev) => new Set(prev).add(normalizedWord));
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  // Mark word as learned
  const markLearnedMutation = useMutation({
    mutationFn: (word: string) =>
      vocabularyApi.markLearned(word, text?.language || "Spanish"),
    onSuccess: (_, word) => {
      const normalizedWord = word.toLowerCase();
      setMarkedWords((prev) => new Set(prev).add(normalizedWord));
      // Update session with the learned word
      updateSession({ wordsMarkedLearned: [normalizedWord] });
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  // Translate word
  const translateWord = useCallback(
    async (word: string, context: string) => {
      setIsLoadingWord(true);
      
      // Track word as looked up (if not already tracked)
      const normalizedWord = word.toLowerCase();
      if (!wordsLookedUpRef.current.has(normalizedWord)) {
        wordsLookedUpRef.current.add(normalizedWord);
        updateSession({ wordsLookedUp: [normalizedWord] });
      }
      
      try {
        const response = await translateApi.full({
          word,
          sourceLanguage: text?.language || "Spanish",
          targetLanguage: nativeLanguage,
          context,
        });
        setWordInfo({ word, ...response.data });
      } catch (error) {
        console.error("Translation error:", error);
        setWordInfo({ word, translation: "Translation failed" });
      } finally {
        setIsLoadingWord(false);
      }
    },
    [text?.language, nativeLanguage, updateSession],
  );

  // Translate sentence
  const translateSentence = useCallback(
    async (sentence: string) => {
      setIsLoadingSentence(true);
      try {
        const response = await translateApi.sentence({
          sentence,
          sourceLanguage: text?.language || "Spanish",
          targetLanguage: nativeLanguage,
          includeGrammarHints: true,
        });
        setSentenceInfo({ sentence, ...response.data });
      } catch (error) {
        console.error("Translation error:", error);
        setSentenceInfo({ sentence, translation: "Translation failed" });
      } finally {
        setIsLoadingSentence(false);
      }
    },
    [text?.language, nativeLanguage],
  );

  // Translate entire text — single backend call, result is cached server-side
  const translateAll = useCallback(async () => {
    if (!text?.content || !textId) return;

    if (parallelTranslations.length > 0) {
      setShowParallelTranslation(true);
      return;
    }

    setIsTranslatingAll(true);
    setShowParallelTranslation(true);
    try {
      const response = await textsApi.translateAll(textId, nativeLanguage);
      setParallelTranslations(response.data.sentences);
    } catch (error) {
      console.error("Parallel translation error:", error);
    } finally {
      setIsTranslatingAll(false);
    }
  }, [text?.content, textId, nativeLanguage]);

  // Handle word click
  const handleWordClick = (word: string, sentence: string) => {
    const cleanWord = word.replace(/[^\p{L}'-]/gu, "").toLowerCase();
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setSelectedSentence(null);
    setSentenceInfo(null);
    setShowSidebar(true);
    translateWord(cleanWord, sentence);
  };

  // Handle sentence selection
  const handleSentenceClick = (sentence: string) => {
    setSelectedSentence(sentence);
    setSelectedWord(null);
    setWordInfo(null);
    setShowSidebar(true);
    translateSentence(sentence);
  };

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingIdx(null);
  }, []);

  // Text-to-speech (single utterance)
  const speak = useCallback(
    (textToSpeak: string, lang?: string) => {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = getLanguageCode(
        lang || data?.text?.language || "Spanish",
      );
      utterance.rate = speechRateRef.current;
      speechSynthesis.speak(utterance);
    },
    [data?.text?.language],
  );

  // Read the entire text aloud, sentence by sentence
  const speakAll = useCallback(() => {
    if (!text?.content) return;
    speechSynthesis.cancel();
    const sentences = text.content.split(/(?<=[.!?”"»'។])\s+/).filter((s: string)=> s.trim().length > 0);
    const lang = getLanguageCode(text.language);
    let idx = 0;
    setIsSpeaking(true);

    const speakNext = () => {
      if (idx >= sentences.length) {
        setIsSpeaking(false);
        setSpeakingIdx(null);
        return;
      }
      setSpeakingIdx(idx);
      const utt = new SpeechSynthesisUtterance(sentences[idx]);
      utt.lang = lang;
      utt.rate = speechRateRef.current;
      utt.onend = () => {
        idx++;
        speakNext();
      };
      utt.onerror = () => {
        setIsSpeaking(false);
        setSpeakingIdx(null);
      };
      speechSynthesis.speak(utt);
    };

    speakNext();
  }, [text?.content, text?.language]);

  const getLanguageCode = (lang: string): string => {
    const codes: Record<string, string> = {
      Spanish: "es-ES",
      French: "fr-FR",
      German: "de-DE",
      Italian: "it-IT",
      Portuguese: "pt-BR",
      Japanese: "ja-JP",
      Korean: "ko-KR",
      Chinese: "zh-CN",
    };
    return codes[lang] || "es-ES";
  };

  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (hoveredWord?.target) {
      const updatePosition = () => {
        const rect = hoveredWord.target.getBoundingClientRect();
        setPopupPos({
          top: rect.top - 44, // Using viewport-relative top for "fixed" positioning
          left: rect.left + rect.width / 2,
        });
      };
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [hoveredWord]);

  // Speak a single sentence (used by per-row buttons in parallel mode)
  const speakSentence = useCallback(
    (sentence: string) => {
      speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(sentence);
      utt.lang = getLanguageCode(text?.language || "Spanish");
      utt.rate = speechRateRef.current;
      speechSynthesis.speak(utt);
    },
    [text?.language],
  );

  // Render clickable words for a single sentence
  const renderSentenceWords = (sentence: string, sIdx: number) => {
    const words = sentence.split(/(\s+)/);
    return words.map((part, wIdx) => {
      if (/^\s+$/.test(part)) {
        return (
          <span
            key={`${sIdx}-${wIdx}`}
            onClick={() => handleSentenceClick(sentence)}
          >
            {part}
          </span>
        );
      }
      const cleanWord = part.replace(/[^\p{L}'-]/gu, "").toLowerCase();
      const isKnown = knownWordsSet.has(cleanWord);
      const isNew = newWordsSet.has(cleanWord);
      const isMarked = markedWords.has(cleanWord);
      const isLearning = markedLearningWords.has(cleanWord);
      const isSelected = selectedWord === cleanWord;
      return (
        <span
          key={`${sIdx}-${wIdx}`}
          onClick={() => handleWordClick(part, sentence)}
          onMouseEnter={(e) => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            const clean = part.replace(/[^\p{L}'-]/gu, "").toLowerCase();
            if (clean) {
              setHoveredWord({
                word: part,
                sentence,
                target: e.currentTarget,
              });
            }
          }}
          onMouseLeave={() => {
            hoverTimeoutRef.current = setTimeout(() => {
              setHoveredWord(null);
            }, 300);
          }}
          className={`
            word cursor-pointer rounded px-0.5 transition-all duration-150
            ${isSelected ? "bg-primary-200 ring-2 ring-primary-400" : ""}
            ${isMarked ? "bg-green-100 text-green-800" : ""}
            ${isLearning && !isMarked ? "bg-yellow-100 text-yellow-800" : ""}
            ${isNew && !isMarked && !isLearning ? "text-primary-700 font-medium" : ""}
            ${!isNew && !isMarked && !isLearning && isKnown ? "text-gray-800" : ""}
            hover:bg-primary-100
          `}
        >
          {part}
        </span>
      );
    });
  };

  // Parse content into clickable words (normal mode)
  const renderContent = () => {
    if (!text?.content) return null;
    const sentences = text.content.split(/(?<=[.!?”"»'។])\s+/).filter((s: string) => s.trim().length > 0);
    return sentences.map((sentence: string, sIdx: number) => (
      <>
        <span
          key={sIdx}
          className={`inline cursor-pointer rounded transition-colors ${
            speakingIdx === sIdx
              ? "bg-primary-100 ring-1 ring-primary-300"
              : selectedSentence === sentence
                ? "bg-yellow-100"
                : "hover:bg-gray-100"
          }`}
          onDoubleClick={() => handleSentenceClick(sentence)}
        >
          {renderSentenceWords(sentence, sIdx)}
        </span>
        <span>&nbsp;</span>
      </>
    ));
  };

  // Parallel (side-by-side) rendering
  const renderParallelContent = () => {
    if (!text?.content) return null;

    if (isTranslatingAll) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm">
            Translating entire text — this will be cached for future visits…
          </p>
        </div>
      );
    }

    const sentences = text.content.split(/(?<=[.!?”"»'។])\s+/).filter((s: string) => s.trim().length > 0);
    return (
      <div className="divide-y divide-gray-100">
        {sentences.map((sentence: string, sIdx: number) => {
          const trans = parallelTranslations[sIdx];
          const displayTranslation = useLiteralTranslation
            ? trans?.literalTranslation || trans?.translation
            : trans?.translation;
          return (
            <div
              key={sIdx}
              className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 py-3 rounded transition-colors ${
                speakingIdx === sIdx ? "bg-primary-50" : ""
              }`}
            >
              {/* Original + play button */}
              <div className="flex items-start gap-1 pl-1.5">
                <button
                  onClick={() => speakSentence(sentence)}
                  className="mt-2.5 shrink-0 p-0.5 text-gray-400 hover:text-primary-600 rounded"
                  title="Read sentence"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
                <span
                  className={`cursor-pointer hover:bg-gray-50 rounded px-1 ${
                    selectedSentence === sentence ? "bg-yellow-100" : ""
                  }`}
                  onDoubleClick={() => handleSentenceClick(sentence)}
                >
                  {renderSentenceWords(sentence, sIdx)}
                </span>
              </div>
              {/* Translation */}
              <span className="text-gray-500 text-sm sm:text-base pl-3 sm:pl-1 border-l-2 border-primary-100 sm:border-0">
                {trans == null ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary-400 inline" />
                ) : (
                  displayTranslation
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !text) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load text</p>
        <button
          onClick={() => navigate("/history")}
          className="btn btn-secondary mt-4"
        >
          Go to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex gap-3 flex-wrap mb-3 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0 /whitespace-nowrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {text.title}
            </h1>
            <p className="text-sm text-gray-500">
              {text.topic} • {text.wordCount} words • {text.difficulty}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Parallel translation toggle */}
          {parallelTranslations.length > 0 ? (
            <>
              {/* Literal / Natural pill — only when panel is open */}
              {showParallelTranslation && (
                <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 text-sm font-medium">
                  <button
                    onClick={() => setUseLiteralTranslation(false)}
                    className={`px-3 py-1.5 transition-colors ${
                      !useLiteralTranslation
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Natural
                  </button>
                  <button
                    onClick={() => setUseLiteralTranslation(true)}
                    className={`px-3 py-1.5 transition-colors ${
                      useLiteralTranslation
                        ? "bg-primary-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Literal
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowParallelTranslation((v) => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showParallelTranslation
                    ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                title={
                  showParallelTranslation
                    ? "Hide translation"
                    : "Show translation"
                }
              >
                {showParallelTranslation ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Translation
              </button>
            </>
          ) : <button
            onClick={translateAll}
            disabled={isTranslatingAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
            title="Translate entire text sentence by sentence"
          >
            {isTranslatingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
            {isTranslatingAll ? "Translating…" : "Translate All"}
          </button>}
          
        </div>
      </div>

      {/* Playback controls bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Speed control */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-1">
          <button
            onClick={() => setSpeechRate(Math.max(0.5, speechRate - 0.05))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm font-bold"
            title="Slower"
          >
            −
          </button>
          <span className="w-10 text-center text-xs font-medium text-gray-700 tabular-nums">
            {speechRate.toFixed(2)}×
          </span>
          <button
            onClick={() => setSpeechRate(Math.min(2.0, speechRate + 0.05))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm font-bold"
            title="Faster"
          >
            +
          </button>
        </div>
        {/* Read All / Stop */}
        {isSpeaking ? (
          <button
            onClick={stopSpeaking}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            onClick={speakAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Read All
          </button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Hover Popup */}
        {hoveredWord && (
          <div
            className="fixed z-50 transform -translate-x-1/2 flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-1.5 py-1 gap-1 animate-in fade-in zoom-in duration-200 pointer-events-auto"
            style={{
              top: `${popupPos.top}px`,
              left: `${popupPos.left}px`,
            }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => {
                setHoveredWord(null);
              }, 300);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(hoveredWord.word);
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-primary-600 transition-colors"
              title="Pronounce"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                markLearningMutation.mutate(
                  hoveredWord.word.replace(/[^\p{L}'-]/gu, "").toLowerCase(),
                );
                setHoveredWord(null);
              }}
              disabled={markedLearningWords.has(
                hoveredWord.word.replace(/[^\p{L}'-]/gu, "").toLowerCase(),
              ) || markedWords.has(
                hoveredWord.word.replace(/[^\p{L}'-]/gu, "").toLowerCase(),
              )}
              className={`p-1.5 rounded-full transition-colors ${
                markedLearningWords.has(
                  hoveredWord.word.replace(/[^\p{L}'-]/gu, "").toLowerCase(),
                )
                  ? "text-yellow-500 bg-yellow-50 cursor-default"
                  : "text-gray-500 hover:text-yellow-600 hover:bg-yellow-50"
              }`}
              title="Mark as Learning"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                markLearnedMutation.mutate(
                  hoveredWord.word.replace(/[^\p{L}'-]/gu, "").toLowerCase(),
                );
                setHoveredWord(null);
              }}
              disabled={markedWords.has(
                hoveredWord.word.replace(/[^\p{L}'-]/gu, "").toLowerCase(),
              )}
              className={`p-1.5 rounded-full transition-colors ${
                markedWords.has(
                  hoveredWord.word.replace(/[^\p{L}'-]/gu, "").toLowerCase(),
                )
                  ? "text-green-500 bg-green-50 cursor-default"
                  : "text-gray-500 hover:text-green-600 hover:bg-green-50"
              }`}
              title="Mark as Learned"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main content */}
        <div
          className={`flex-1 ${showSidebar ? (!showParallelTranslation ? "/lg:pr-80" : "") : ""}`}
        >
          {/* Reading instructions */}
          <div className="card p-4 mb-4 bg-primary-50 border-primary-200">
            <p className="text-sm text-primary-700">
              <strong>Tip:</strong> Click any word for translation & grammar
              info. Double-click a sentence for full translation with grammar
              notes.
            </p>
          </div>

          {/* Text content */}
          <div
            ref={contentRef}
            className="card p-4 lg:p-8 reading-text"
            style={{ fontSize: "1.2rem", lineHeight: "2" }}
          >
            {showParallelTranslation
              ? renderParallelContent()
              : renderContent()}
          </div>

          {/* Difficulty adjustment */}
          <div className="card p-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Adjust difficulty:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => simplifyMutation.mutate()}
                  disabled={
                    simplifyMutation.isPending || text.difficulty === "beginner"
                  }
                  className="btn btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {simplifyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Simplify
                    </>
                  )}
                </button>
                <button
                  onClick={() => harderMutation.mutate()}
                  disabled={
                    harderMutation.isPending || text.difficulty === "advanced"
                  }
                  className="btn btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {harderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Harder
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card p-4 mt-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  <span className="text-primary-600 font-medium">
                    {text.newWordsIntroduced?.length || 0}
                  </span>{" "}
                  new words
                </span>
                <span className="text-gray-600">
                  <span className="text-green-600 font-medium">
                    {markedWords.size}
                  </span>{" "}
                  marked as learned
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <BookOpen className="w-4 h-4" />
                <span>{text.language}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (selectedWord || selectedSentence) && (
          <div className="fixed bottom-0 left-0 right-0 max-h-[60vh] sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 lg:top-8 sm:w-80 sm:max-h-[calc(100vh-6rem)] overflow-y-auto z-30">
            <div className="card p-6 animate-fade-in rounded-t-2xl sm:rounded-2xl">
              <button
                onClick={() => {
                  setSelectedWord(null);
                  setSelectedSentence(null);
                  setWordInfo(null);
                  setSentenceInfo(null);
                }}
                className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Word info */}
              {selectedWord && (
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {selectedWord}
                      </h3>
                      {wordInfo?.baseForm &&
                        wordInfo.baseForm !== selectedWord && (
                          <p className="text-sm text-gray-500">
                            Base form:{" "}
                            <span className="font-medium">
                              {wordInfo.baseForm}
                            </span>
                          </p>
                        )}
                    </div>
                    <button
                      onClick={() => speak(selectedWord)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Listen"
                    >
                      <Volume2 className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {isLoadingWord ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                  ) : wordInfo ? (
                    <div className="space-y-4">
                      {/* Part of speech */}
                      {wordInfo.partOfSpeech && (
                        <div className="inline-block px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                          {wordInfo.partOfSpeech}
                          {wordInfo.gender && ` (${wordInfo.gender})`}
                        </div>
                      )}

                      {/* Translation */}
                      <div>
                        <p className="text-xl font-medium text-gray-900">
                          {wordInfo.translation}
                        </p>
                        {wordInfo.alternativeTranslations &&
                          wordInfo.alternativeTranslations.length > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              Also:{" "}
                              {wordInfo.alternativeTranslations.join(", ")}
                            </p>
                          )}
                      </div>

                      {/* Conjugation info */}
                      {wordInfo.conjugation &&
                        Object.keys(wordInfo.conjugation).length > 0 && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800 mb-1">
                              Conjugation
                            </p>
                            <p className="text-sm text-blue-700">
                              {wordInfo.conjugation.tense &&
                                `${wordInfo.conjugation.tense}`}
                              {wordInfo.conjugation.person &&
                                `, ${wordInfo.conjugation.person}`}
                              {wordInfo.conjugation.mood &&
                                ` (${wordInfo.conjugation.mood})`}
                            </p>
                          </div>
                        )}

                      {/* Contextual note */}
                      {wordInfo.contextualNote && (
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <Sparkles className="w-4 h-4 inline mr-1" />
                            {wordInfo.contextualNote}
                          </p>
                        </div>
                      )}

                      {/* Mark as learned button */}
                      <button
                        onClick={() => markLearnedMutation.mutate(selectedWord)}
                        disabled={
                          markedWords.has(selectedWord) ||
                          markLearnedMutation.isPending
                        }
                        className={`w-full btn ${
                          markedWords.has(selectedWord)
                            ? "bg-green-100 text-green-700 cursor-default"
                            : "btn-primary"
                        }`}
                      >
                        {markedWords.has(selectedWord) ? (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Marked as Learned
                          </>
                        ) : markLearnedMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Mark as Learned
                          </>
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Sentence info */}
              {selectedSentence && (
                <div>
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Sentence Translation
                    </h3>
                    <button
                      onClick={() => speak(selectedSentence)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Listen"
                    >
                      <Volume2 className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {isLoadingSentence ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    </div>
                  ) : sentenceInfo ? (
                    <div className="space-y-4">
                      {/* Original sentence */}
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 italic">
                          {selectedSentence}
                        </p>
                      </div>

                      {/* Translation */}
                      <div>
                        <p className="font-medium text-gray-900">
                          {sentenceInfo.translation}
                        </p>
                      </div>

                      {/* Literal translation */}
                      {sentenceInfo.literalTranslation && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm font-medium text-purple-800 mb-1">
                            Word-for-word
                          </p>
                          <p className="text-sm text-purple-700">
                            {sentenceInfo.literalTranslation}
                          </p>
                        </div>
                      )}

                      {/* Grammar notes */}
                      {sentenceInfo.grammarNotes &&
                        sentenceInfo.grammarNotes.length > 0 && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-800 mb-2">
                              Grammar Notes
                            </p>
                            <ul className="space-y-2">
                              {sentenceInfo.grammarNotes.map((note, idx) => (
                                <li key={idx} className="text-sm text-blue-700">
                                  <span className="font-medium">
                                    {note.element}:
                                  </span>{" "}
                                  {note.explanation}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
