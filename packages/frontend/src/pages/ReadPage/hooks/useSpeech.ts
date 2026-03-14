import { useState, useCallback, useRef, useEffect } from "react";
import { splitSentences } from "@duopara/shared";
import { getLanguageCode, getStoredNumber, setStoredValue } from "../utils";

interface UseSpeechResult {
  isSpeaking: boolean;
  speakingIdx: number | null;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  speak: (text: string, lang?: string) => void;
  speakAll: () => void;
  speakSentence: (sentence: string) => void;
  stopSpeaking: () => void;
}

export function useSpeech(content: string | undefined, language: string): UseSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [speechRate, setSpeechRateState] = useState(() =>
    getStoredNumber("duopara.speechRate", 0.9)
  );
  const speechRateRef = useRef(speechRate);

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  const setSpeechRate = useCallback((rate: number) => {
    const clamped = Math.round(rate * 100) / 100;
    setSpeechRateState(clamped);
    speechRateRef.current = clamped;
    setStoredValue("duopara.speechRate", clamped);
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingIdx(null);
  }, []);

  const speak = useCallback(
    (textToSpeak: string, lang?: string) => {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = getLanguageCode(lang || language);
      utterance.rate = speechRateRef.current;
      speechSynthesis.speak(utterance);
    },
    [language]
  );

  const speakSentence = useCallback(
    (sentence: string) => {
      speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(sentence);
      utt.lang = getLanguageCode(language);
      utt.rate = speechRateRef.current;
      speechSynthesis.speak(utt);
    },
    [language]
  );

  const speakAll = useCallback(() => {
    if (!content) return;
    speechSynthesis.cancel();
    const sentences = splitSentences(content);
    const lang = getLanguageCode(language);
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
  }, [content, language]);

  return {
    isSpeaking,
    speakingIdx,
    speechRate,
    setSpeechRate,
    speak,
    speakAll,
    speakSentence,
    stopSpeaking,
  };
}
