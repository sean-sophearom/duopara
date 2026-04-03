import { ref, watch, onMounted, onUnmounted } from 'vue';
import { splitSentences } from '@duopara/shared';
import {
  getLanguageCode,
  getStoredNumber,
  setStoredValue,
  getStoredVoiceURI,
  setStoredVoiceURI,
  getVoicesForLanguage,
} from '../utils';

export function useSpeech(
  content: () => string | undefined,
  language: () => string
) {
  const isSpeaking = ref(false);
  const speakingIdx = ref<number | null>(null);
  const speechRate = ref(getStoredNumber('duopara.speechRate', 0.9));

  const allVoices = ref<SpeechSynthesisVoice[]>([]);
  const voices = ref<SpeechSynthesisVoice[]>([]);
  const fallbackVoices = ref<SpeechSynthesisVoice[]>([]);
  const selectedVoice = ref<SpeechSynthesisVoice | null>(null);

  // Keep a plain variable ref for use inside callbacks (avoids reactivity overhead)
  let selectedVoiceRaw: SpeechSynthesisVoice | null = null;
  let speechRateRaw = speechRate.value;

  function loadVoices() {
    const available = speechSynthesis.getVoices();
    if (available.length > 0) {
      allVoices.value = available;
    }
  }

  onMounted(() => {
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
  });

  onUnmounted(() => {
    speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  });

  // Filter voices when language or allVoices changes
  watch(
    [allVoices, language],
    ([av, lang]) => {
      if (av.length === 0) return;

      const { primary, fallback } = getVoicesForLanguage(av, lang);
      voices.value = primary;
      fallbackVoices.value = fallback;

      const storedURI = getStoredVoiceURI(lang);
      let voice: SpeechSynthesisVoice | null = null;

      if (storedURI) {
        voice =
          primary.find((v) => v.voiceURI === storedURI) ||
          fallback.find((v) => v.voiceURI === storedURI) ||
          null;
      }

      if (!voice) {
        voice = primary[0] || fallback[0] || null;
      }

      selectedVoice.value = voice;
      selectedVoiceRaw = voice;
    },
    { immediate: true }
  );

  watch(speechRate, (rate) => {
    speechRateRaw = rate;
  });

  function setSelectedVoice(voice: SpeechSynthesisVoice) {
    selectedVoice.value = voice;
    selectedVoiceRaw = voice;
    setStoredVoiceURI(language(), voice.voiceURI);
  }

  function setSpeechRate(rate: number) {
    const clamped = Math.round(rate * 100) / 100;
    speechRate.value = clamped;
    speechRateRaw = clamped;
    setStoredValue('duopara.speechRate', clamped);
  }

  function stopSpeaking() {
    speechSynthesis.cancel();
    isSpeaking.value = false;
    speakingIdx.value = null;
  }

  function speak(textToSpeak: string, lang?: string) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (selectedVoiceRaw) utterance.voice = selectedVoiceRaw;
    utterance.lang = getLanguageCode(lang || language());
    utterance.rate = speechRateRaw;
    speechSynthesis.speak(utterance);
  }

  function speakSentence(sentence: string) {
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(sentence);
    if (selectedVoiceRaw) utt.voice = selectedVoiceRaw;
    utt.lang = getLanguageCode(language());
    utt.rate = speechRateRaw;
    speechSynthesis.speak(utt);
  }

  function speakAll() {
    const c = content();
    if (!c) return;
    speechSynthesis.cancel();
    const sentences = splitSentences(c);
    const lang = getLanguageCode(language());
    let idx = 0;
    isSpeaking.value = true;

    const speakNext = () => {
      if (idx >= sentences.length) {
        isSpeaking.value = false;
        speakingIdx.value = null;
        return;
      }
      speakingIdx.value = idx;
      const utt = new SpeechSynthesisUtterance(sentences[idx]);
      if (selectedVoiceRaw) utt.voice = selectedVoiceRaw;
      utt.lang = lang;
      utt.rate = speechRateRaw;
      utt.onend = () => {
        idx++;
        speakNext();
      };
      utt.onerror = () => {
        isSpeaking.value = false;
        speakingIdx.value = null;
      };
      speechSynthesis.speak(utt);
    };

    speakNext();
  }

  return {
    isSpeaking,
    speakingIdx,
    speechRate,
    setSpeechRate,
    speak,
    speakAll,
    speakSentence,
    stopSpeaking,
    voices,
    fallbackVoices,
    selectedVoice,
    setSelectedVoice,
  };
}
