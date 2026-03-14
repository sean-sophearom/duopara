import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { splitSentences } from "@duopara/shared";

import { textsApi, translateApi, vocabularyApi, generateApi } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

import { useReadingSession, useSpeech, useHighlightPreferences } from "./hooks";
import {
  WordPopup,
  PlaybackControls,
  Sidebar,
  ParallelView,
  SentenceRenderer,
  DifficultyControls,
  ReadingStats,
  TranslationControls,
} from "./components";
import { cleanWord } from "./utils";
import type { WordInfo, SentenceInfo, HoveredWord, ParallelTranslation, ReadingText } from "./types";

export default function ReadPage() {
  const { textId } = useParams<{ textId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // State for word/sentence selection
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [sentenceInfo, setSentenceInfo] = useState<SentenceInfo | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Parallel translation state
  const [showParallelTranslation, setShowParallelTranslation] = useState(false);
  const [parallelTranslations, setParallelTranslations] = useState<Array<ParallelTranslation | null>>([]);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);

  // Hover state
  const [hoveredWord, setHoveredWord] = useState<HoveredWord | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const nativeLanguage = user?.settings?.nativeLanguage || "English";

  // Fetch text data
  const { data, isLoading, error } = useQuery({
    queryKey: ["text", textId],
    queryFn: () => textsApi.getOne(textId!).then((r) => r.data),
    enabled: !!textId,
  });

  const text = data?.text as ReadingText | undefined;
  const knownWordsSet = new Set((text?.knownWordsUsed || []).map((w: string) => w.toLowerCase()));
  const newWordsSet = new Set((text?.newWordsIntroduced || []).map((w: string) => w.toLowerCase()));

  // Fetch learning vocabulary
  const { data: learningVocabData } = useQuery({
    queryKey: ["vocabulary", "learning", text?.language],
    queryFn: () =>
      vocabularyApi
        .getAll({ language: text?.language, status: "learning", limit: 1000 })
        .then((r) => r.data),
    enabled: !!text?.language,
  });

  const [markedLearningWords, setMarkedLearningWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (learningVocabData?.words) {
      setMarkedLearningWords(
        new Set(learningVocabData.words.map((w: { word: string }) => w.word.toLowerCase()))
      );
    }
  }, [learningVocabData]);

  // Custom hooks
  const { markedWords, setMarkedWords, trackWordLookup, updateSessionWithLearnedWord } =
    useReadingSession(text, textId);

  const {
    isSpeaking,
    speakingIdx,
    speechRate,
    setSpeechRate,
    speak,
    speakAll,
    speakSentence,
    stopSpeaking,
  } = useSpeech(text?.content, text?.language || "Spanish");

  const {
    highlightLearned,
    highlightLearning,
    highlightNew,
    useLiteralTranslation,
    setUseLiteralTranslation,
  } = useHighlightPreferences();

  // Popup position update
  useEffect(() => {
    if (hoveredWord?.target) {
      const updatePosition = () => {
        const rect = hoveredWord.target.getBoundingClientRect();
        setPopupPos({
          top: rect.top - 44,
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

  // Mutations
  const simplifyMutation = useMutation({
    mutationFn: () => generateApi.regenerate(textId!, "simplify"),
    onSuccess: (response) => navigate(`/read/${response.data.text.id}`),
  });

  const harderMutation = useMutation({
    mutationFn: () => generateApi.regenerate(textId!, "harder"),
    onSuccess: (response) => navigate(`/read/${response.data.text.id}`),
  });

  const markLearningMutation = useMutation({
    mutationFn: (word: string) => vocabularyApi.markLearning(word, text?.language || "Spanish"),
    onSuccess: (_, word) => {
      setMarkedLearningWords((prev) => new Set(prev).add(word.toLowerCase()));
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  const markLearnedMutation = useMutation({
    mutationFn: (word: string) => vocabularyApi.markLearned(word, text?.language || "Spanish"),
    onSuccess: (_, word) => {
      const normalized = word.toLowerCase();
      setMarkedWords((prev) => new Set(prev).add(normalized));
      updateSessionWithLearnedWord(normalized);
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
  });

  // Translation handlers
  const translateWord = useCallback(
    async (word: string, context: string) => {
      setIsLoadingWord(true);
      trackWordLookup(word);

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
    [text?.language, nativeLanguage, trackWordLookup]
  );

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
    [text?.language, nativeLanguage]
  );

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
  }, [text?.content, textId, nativeLanguage, parallelTranslations.length]);

  // Event handlers
  const handleWordClick = (word: string, sentence: string) => {
    const clean = cleanWord(word);
    if (!clean) return;

    setSelectedWord(clean);
    setSelectedSentence(null);
    setSentenceInfo(null);
    setShowSidebar(true);
    translateWord(clean, sentence);
  };

  const handleSentenceClick = (sentence: string) => {
    setSelectedSentence(sentence);
    setSelectedWord(null);
    setWordInfo(null);
    setShowSidebar(true);
    translateSentence(sentence);
  };

  const handleWordHover = (word: string | null, sentence: string, target: HTMLElement | null) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    if (word && target) {
      const clean = cleanWord(word);
      if (clean) {
        setHoveredWord({ word, sentence, target });
      }
    } else {
      hoverTimeoutRef.current = setTimeout(() => setHoveredWord(null), 300);
    }
  };

  const handleMarkLearning = (word: string) => {
    markLearningMutation.mutate(word);
    setHoveredWord(null);
  };

  const handleMarkLearned = (word: string) => {
    markLearnedMutation.mutate(word);
    setHoveredWord(null);
  };

  const closeSidebar = () => {
    setSelectedWord(null);
    setSelectedSentence(null);
    setWordInfo(null);
    setSentenceInfo(null);
  };

  // Render content (normal mode)
  const renderContent = () => {
    if (!text?.content) return null;
    const sentences = splitSentences(text.content);

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
          <SentenceRenderer
            sentence={sentence}
            sIdx={sIdx}
            selectedWord={selectedWord}
            knownWordsSet={knownWordsSet}
            newWordsSet={newWordsSet}
            markedWords={markedWords}
            markedLearningWords={markedLearningWords}
            highlightLearned={highlightLearned}
            highlightLearning={highlightLearning}
            highlightNew={highlightNew}
            onWordClick={handleWordClick}
            onSentenceClick={handleSentenceClick}
            onWordHover={handleWordHover}
          />
        </span>
        <span>&nbsp;</span>
      </>
    ));
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
        <button onClick={() => navigate("/history")} className="btn btn-secondary mt-4">
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
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{text.title}</h1>
            <p className="text-sm text-gray-500">
              {text.topic} • {text.wordCount} words • {text.difficulty}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TranslationControls
            hasTranslations={parallelTranslations.length > 0}
            isTranslating={isTranslatingAll}
            showParallelTranslation={showParallelTranslation}
            useLiteralTranslation={useLiteralTranslation}
            onTranslateAll={translateAll}
            onToggleParallelView={() => setShowParallelTranslation((v) => !v)}
            onToggleLiteral={setUseLiteralTranslation}
          />
        </div>
      </div>

      {/* Playback controls */}
      <PlaybackControls
        isSpeaking={isSpeaking}
        speechRate={speechRate}
        onSpeakAll={speakAll}
        onStop={stopSpeaking}
        onRateChange={setSpeechRate}
      />

      <div className="flex gap-6">
        {/* Hover Popup */}
        {hoveredWord && (
          <WordPopup
            hoveredWord={hoveredWord}
            popupPos={popupPos}
            markedLearningWords={markedLearningWords}
            markedWords={markedWords}
            onSpeak={speak}
            onMarkLearning={handleMarkLearning}
            onMarkLearned={handleMarkLearned}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(() => setHoveredWord(null), 300);
            }}
          />
        )}

        {/* Main content */}
        <div className={`flex-1 ${showSidebar && !showParallelTranslation ? "" : ""}`}>
          {/* Reading instructions */}
          <div className="card p-4 mb-4 bg-primary-50 border-primary-200">
            <p className="text-sm text-primary-700">
              <strong>Tip:</strong> Click any word for translation & grammar info. Double-click a
              sentence for full translation with grammar notes.
            </p>
          </div>

          {/* Text content */}
          <div className="card p-4 lg:p-8 reading-text" style={{ fontSize: "1.2rem", lineHeight: "2" }}>
            {showParallelTranslation ? (
              <ParallelView
                content={text.content}
                translations={parallelTranslations}
                isTranslating={isTranslatingAll}
                useLiteralTranslation={useLiteralTranslation}
                speakingIdx={speakingIdx}
                selectedSentence={selectedSentence}
                selectedWord={selectedWord}
                knownWordsSet={knownWordsSet}
                newWordsSet={newWordsSet}
                markedWords={markedWords}
                markedLearningWords={markedLearningWords}
                highlightLearned={highlightLearned}
                highlightLearning={highlightLearning}
                highlightNew={highlightNew}
                onSpeakSentence={speakSentence}
                onWordClick={handleWordClick}
                onSentenceClick={handleSentenceClick}
                onWordHover={handleWordHover}
              />
            ) : (
              renderContent()
            )}
          </div>

          {/* Difficulty adjustment */}
          <DifficultyControls
            difficulty={text.difficulty}
            isSimplifying={simplifyMutation.isPending}
            isMakingHarder={harderMutation.isPending}
            onSimplify={() => simplifyMutation.mutate()}
            onHarder={() => harderMutation.mutate()}
          />

          {/* Stats */}
          <ReadingStats
            newWordsCount={text.newWordsIntroduced?.length || 0}
            markedWordsCount={markedWords.size}
            language={text.language}
          />
        </div>

        {/* Sidebar */}
        {showSidebar && (selectedWord || selectedSentence) && (
          <Sidebar
            selectedWord={selectedWord}
            selectedSentence={selectedSentence}
            wordInfo={wordInfo}
            sentenceInfo={sentenceInfo}
            isLoadingWord={isLoadingWord}
            isLoadingSentence={isLoadingSentence}
            markedWords={markedWords}
            onSpeak={speak}
            onMarkLearned={handleMarkLearned}
            onClose={closeSidebar}
            isMarkingLearned={markLearnedMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
