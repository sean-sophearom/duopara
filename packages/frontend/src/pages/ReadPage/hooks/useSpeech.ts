import { useState, useCallback, useRef, useEffect } from "react";
import { splitSentences } from "@duopara/shared";
import {
  getLanguageCode,
  getStoredNumber,
  setStoredValue,
  getStoredVoiceURI,
  setStoredVoiceURI,
  getVoicesForLanguage,
} from "../utils";

interface UseSpeechResult {
  isSpeaking: boolean;
  speakingIdx: number | null;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  speak: (text: string, lang?: string) => void;
  speakAll: () => void;
  speakSentence: (sentence: string) => void;
  stopSpeaking: () => void;
  // Voice selection
  voices: SpeechSynthesisVoice[];
  fallbackVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice) => void;
}

export function useSpeech(content: string | undefined, language: string): UseSpeechResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [speechRate, setSpeechRateState] = useState(() =>
    getStoredNumber("duopara.speechRate", 0.9)
  );
  const speechRateRef = useRef(speechRate);

  // Voice selection state
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [fallbackVoices, setFallbackVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState<SpeechSynthesisVoice | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices from the browser
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setAllVoices(availableVoices);
      }
    };

    loadVoices();

    // Chrome loads voices asynchronously
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Filter voices when language or allVoices changes
  useEffect(() => {
    if (allVoices.length === 0) return;

    const { primary, fallback } = getVoicesForLanguage(allVoices, language);
    setVoices(primary);
    setFallbackVoices(fallback);

    // Try to restore stored voice or select first available
    const storedURI = getStoredVoiceURI(language);
    let voice: SpeechSynthesisVoice | null = null;

    if (storedURI) {
      voice = primary.find((v) => v.voiceURI === storedURI) || 
              fallback.find((v) => v.voiceURI === storedURI) || null;
    }

    // Fallback: select first primary voice, or first fallback
    if (!voice) {
      voice = primary[0] || fallback[0] || null;
    }

    setSelectedVoiceState(voice);
    selectedVoiceRef.current = voice;
  }, [allVoices, language]);

  const setSelectedVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      setSelectedVoiceState(voice);
      selectedVoiceRef.current = voice;
      setStoredVoiceURI(language, voice.voiceURI);
    },
    [language]
  );

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
      
      // Use selected voice if available, otherwise fall back to language code
      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }
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
      
      // Use selected voice if available
      if (selectedVoiceRef.current) {
        utt.voice = selectedVoiceRef.current;
      }
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
      
      // Use selected voice if available
      if (selectedVoiceRef.current) {
        utt.voice = selectedVoiceRef.current;
      }
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
    // Voice selection
    voices,
    fallbackVoices,
    selectedVoice,
    setSelectedVoice,
  };
}
