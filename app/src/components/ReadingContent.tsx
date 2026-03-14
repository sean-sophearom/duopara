'use dom';

import { useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────
interface ParallelTranslation {
  translation: string;
  literalTranslation?: string;
}

interface ReadingContentProps {
  dom?: import('expo/dom').DOMProps;
  content: string;
  mode: 'normal' | 'parallel';
  parallelTranslations: Array<ParallelTranslation | null>;
  isTranslatingAll: boolean;
  useLiteralTranslation: boolean;
  speakingIdx: number | null;
  markedWords: string[];
  markedLearningWords: string[];
  newWords: string[];
  knownWords: string[];
  highlightLearned: boolean;
  highlightLearning: boolean;
  highlightNew: boolean;
  colorScheme: 'light' | 'dark';
  onWordPress: (word: string, sentence: string) => Promise<void>;
  onSentencePress: (sentence: string) => Promise<void>;
  onSpeakSentence: (sentence: string) => Promise<void>;
  onLayout: (size: { width: number; height: number }) => Promise<void>;
}

// ── Utilities ──────────────────────────────────────────────
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?""»'។])\s+/).filter((s) => s.trim().length > 0);
}

function cleanWord(word: string): string {
  return word.replace(/[^\p{L}''-]/gu, '').toLowerCase();
}

// ── Color palettes ─────────────────────────────────────────
const lightColors = {
  owl50: '#f8fafc',
  owl100: '#ffffff',
  owl200: '#f1f5f9',
  owl300: '#e2e8f0',
  owl400: '#78849a',
  owl500: '#5b6b82',
  owl600: '#475569',
  owl700: '#334155',
  owl800: '#1e293b',
  owl900: '#0f172a',
  primary50: '#eff6ff',
  primary100: '#dbeafe',
  primary200: '#bfdbfe',
  primary300: '#93c5fd',
  primary400: '#3b82f6',
  primary500: '#3b82f6',
  secondary500: '#1cb0f6',
  green100: '#dcfce7',
  green700: '#15803d',
  green800: '#166534',
  yellow100: '#fef9c3',
  yellow700: '#a16207',
  yellow800: '#854d0e',
  blue500: '#3b82f6',
  purple500: '#a855f7',
};

const darkColors = {
  owl50: '#1c1c1e',
  owl100: '#2c2c2e',
  owl200: '#3a3a3c',
  owl300: '#48484a',
  owl400: '#8e8e93',
  owl500: '#a1a1a6',
  owl600: '#c7c7cc',
  owl700: '#d1d1d6',
  owl800: '#e5e5ea',
  owl900: '#f2f2f7',
  primary50: '#172554',
  primary100: '#1e3a8a',
  primary200: '#1e40af',
  primary300: '#2563eb',
  primary400: '#3b82f6',
  primary500: '#3b82f6',
  secondary500: '#1cb0f6',
  green100: '#1a4d1a',
  green700: '#86efac',
  green800: '#bbf7d0',
  yellow100: '#4d3d00',
  yellow700: '#fde047',
  yellow800: '#fef08a',
  blue500: '#60a5fa',
  purple500: '#c084fc',
};

// ── Component ──────────────────────────────────────────────
export default function ReadingContent({
  content,
  mode,
  parallelTranslations,
  isTranslatingAll,
  useLiteralTranslation,
  speakingIdx,
  markedWords,
  markedLearningWords,
  newWords,
  knownWords,
  highlightLearned,
  highlightLearning,
  highlightNew,
  colorScheme,
  onWordPress,
  onSentencePress,
  onSpeakSentence,
  onLayout,
}: ReadingContentProps) {
  const c = colorScheme === 'dark' ? darkColors : lightColors;

  const markedSet = new Set(markedWords);
  const learningSet = new Set(markedLearningWords);
  const newSet = new Set(newWords);
  const knownSet = new Set(knownWords);

  // Report size changes back to native
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        onLayout({ width, height });
      }
    });
    observer.observe(document.body);
    // Initial report
    onLayout({ width: document.body.clientWidth, height: document.body.clientHeight });
    return () => observer.disconnect();
  }, [onLayout]);

  // Re-report on content changes
  useEffect(() => {
    requestAnimationFrame(() => {
      onLayout({ width: document.body.clientWidth, height: document.body.clientHeight });
    });
  }, [content, mode, parallelTranslations, isTranslatingAll, onLayout]);

  const getWordStyle = useCallback(
    (word: string): React.CSSProperties => {
      const clean = cleanWord(word);
      if (markedSet.has(clean) && highlightLearned) {
        return {
          backgroundColor: c.green100 + '80',
          color: c.green700,
          borderRadius: 4,
          padding: '0 2px',
        };
      }
      if (learningSet.has(clean) && highlightLearning) {
        return {
          backgroundColor: c.yellow100 + '80',
          color: c.yellow700,
          borderRadius: 4,
          padding: '0 2px',
        };
      }
      if (newSet.has(clean) && highlightNew) {
        return { color: c.blue500, fontWeight: 500 };
      }
      return { color: c.owl800 };
    },
    [markedSet, learningSet, newSet, highlightLearned, highlightLearning, highlightNew, c]
  );

  const handleWordClick = (word: string, sentence: string) => {
    const clean = cleanWord(word);
    if (!clean || clean.length < 2) return;
    onWordPress(word, sentence);
  };

  const sentences = splitSentences(content);

  if (mode === 'parallel') {
    return (
      <div style={{ fontFamily: 'Nunito, serif', color: c.owl800, padding: "16px 16px 0 16px" }}>
        <style>{getStyles(c)}</style>
        {isTranslatingAll ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '48px 0',
              gap: 16,
              color: c.owl500,
            }}>
            <div className="spinner" />
            <p style={{ fontWeight: 600, color: c.owl700, margin: 0 }}>Translating text...</p>
            <p style={{ fontSize: 13, color: c.owl500, margin: 0 }}>
              This will be cached for future visits.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sentences.map((sentence, sIdx) => {
              const trans = parallelTranslations[sIdx];
              const displayTranslation = useLiteralTranslation
                ? trans?.literalTranslation || trans?.translation
                : trans?.translation;

              return (
                <div
                  key={sIdx}
                  className={speakingIdx === sIdx ? 'speaking-row' : ''}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '12px 0',
                    borderBottom: `1px solid ${c.owl200}`,
                    borderRadius: speakingIdx === sIdx ? 12 : 0,
                    backgroundColor: speakingIdx === sIdx ? c.primary100 : 'transparent',
                    transition: 'background-color 0.2s',
                  }}>
                  {/* Original sentence */}
                  <div
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingLeft: 4 }}>
                    <button
                      onClick={() => onSpeakSentence(sentence)}
                      className="speak-btn"
                      title="Read sentence">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    </button>
                    <span
                      style={{ lineHeight: 2, fontSize: '1.1rem', cursor: 'pointer' }}
                      onDoubleClick={() => onSentencePress(sentence)}>
                      {renderWords(sentence, sIdx, getWordStyle, handleWordClick, onSentencePress)}
                    </span>
                  </div>
                  {/* Translation */}
                  <span
                    style={{
                      color: c.owl400,
                      fontSize: '0.95rem',
                      lineHeight: 2,
                      paddingLeft: 12,
                      borderLeft: `2px solid ${c.primary300}`,
                      fontFamily: 'Nunito, system-ui, sans-serif',
                      fontStyle: 'italic',
                    }}>
                    {trans == null ? <span className="spinner-sm" /> : displayTranslation}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Normal reading mode
  return (
    <div
      style={{
        fontFamily: 'Nunito, serif',
        fontSize: '1.15rem',
        lineHeight: 2,
        color: c.owl800,
        padding: "16px 16px 0 16px",
      }}>
      <style>{getStyles(c)}</style>
      {sentences.map((sentence, sIdx) => (
        <span key={sIdx}>
          <span
            className={speakingIdx === sIdx ? 'speaking-sentence' : 'sentence'}
            onDoubleClick={() => onSentencePress(sentence)}>
            {renderWords(sentence, sIdx, getWordStyle, handleWordClick, onSentencePress)}
          </span>
          <span>&nbsp;</span>
        </span>
      ))}
    </div>
  );
}

// ── Render helpers ─────────────────────────────────────────
function renderWords(
  sentence: string,
  sIdx: number,
  getWordStyle: (word: string) => React.CSSProperties,
  onWordClick: (word: string, sentence: string) => void,
  onSentencePress: (sentence: string) => Promise<void>
) {
  const parts = sentence.split(/(\s+)/);
  return parts.map((part, wIdx) => {
    if (/^\s+$/.test(part)) {
      return <span key={`${sIdx}-${wIdx}`}>{part}</span>;
    }
    return (
      <span
        key={`${sIdx}-${wIdx}`}
        className="word"
        style={getWordStyle(part)}
        onClick={() => onWordClick(part, sentence)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onSentencePress(sentence);
        }}>
        {part}
      </span>
    );
  });
}

// ── Styles ─────────────────────────────────────────────────
function getStyles(c: typeof lightColors) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      -webkit-text-size-adjust: 100%;
      overflow: hidden;
    }

    .word {
      cursor: pointer;
      border-radius: 3px;
      padding: 0 1px;
      transition: background-color 0.15s, color 0.15s;
    }
    .word:hover, .word:active {
      background-color: ${c.primary200} !important;
    }

    .sentence {
      border-radius: 4px;
      padding: 0 2px;
      transition: background-color 0.2s, border 0.2s;
      border: 1px solid transparent;
    }
    .sentence:hover {
      background-color: ${c.owl200};
    }

    .speaking-sentence {
      background-color: ${c.primary200};
      border-radius: 4px;
      padding: 0 2px;
      transition: background-color 0.2s, border 0.2s;
      border: 1px solid ${c.primary300};
    }

    .speaking-row {
      background-color: ${c.primary100};
    }

    .speak-btn {
      margin-top: 10px;
      flex-shrink: 0;
      padding: 4px;
      color: ${c.owl400};
      background: none;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: color 0.15s;
    }
    .speak-btn:hover, .speak-btn:active {
      color: ${c.primary500};
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner {
      width: 32px; height: 32px;
      border: 3px solid ${c.owl300};
      border-top-color: ${c.purple500};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-sm {
      display: inline-block;
      width: 16px; height: 16px;
      border: 2px solid ${c.owl300};
      border-top-color: ${c.purple500};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
    }

    @media (max-width: 500px) {
      div[style*="grid-template-columns"] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
}
