<script setup lang="ts">
import { Play, Square, Volume2 } from 'lucide-vue-next';
import { formatVoiceName } from '../utils';

const props = defineProps<{
  isSpeaking: boolean;
  speechRate: number;
  voices: SpeechSynthesisVoice[];
  fallbackVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
}>();

const emit = defineEmits<{
  speakAll: [];
  stop: [];
  rateChange: [rate: number];
  voiceChange: [voice: SpeechSynthesisVoice];
}>();

function handleVoiceChange(e: Event) {
  const voiceURI = (e.target as HTMLSelectElement).value;
  const allVoices = [...props.voices, ...props.fallbackVoices];
  const voice = allVoices.find((v) => v.voiceURI === voiceURI);
  if (voice) emit('voiceChange', voice);
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 mb-4">
    <!-- Voice selection -->
    <div class="flex items-center gap-2">
      <Volume2 class="w-4 h-4 text-gray-500" />
      <select
        :value="selectedVoice?.voiceURI || ''"
        @change="handleVoiceChange"
        class="text-sm bg-gray-100 border-0 rounded-lg px-2 py-1.5 pr-8 focus:ring-2 focus:ring-primary-500 cursor-pointer max-w-[200px]"
        title="Select voice"
      >
        <optgroup v-if="voices.length > 0" label="Matching language">
          <option v-for="voice in voices" :key="voice.voiceURI" :value="voice.voiceURI">
            {{ formatVoiceName(voice) }}
          </option>
        </optgroup>
        <optgroup v-if="fallbackVoices.length > 0" label="Other languages">
          <option v-for="voice in fallbackVoices" :key="voice.voiceURI" :value="voice.voiceURI">
            {{ formatVoiceName(voice) }}
          </option>
        </optgroup>
      </select>
    </div>

    <!-- Speed control -->
    <div class="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-1">
      <button
        @click="emit('rateChange', Math.max(0.5, speechRate - 0.05))"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm font-bold"
        title="Slower"
      >
        −
      </button>
      <span class="w-10 text-center text-xs font-medium text-gray-700 tabular-nums">
        {{ speechRate.toFixed(2) }}×
      </span>
      <button
        @click="emit('rateChange', Math.min(2.0, speechRate + 0.05))"
        class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm font-bold"
        title="Faster"
      >
        +
      </button>
    </div>

    <!-- Read All / Stop -->
    <button
      v-if="isSpeaking"
      @click="emit('stop')"
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
    >
      <Square class="w-3.5 h-3.5 fill-current" />
      Stop
    </button>
    <button
      v-else
      @click="emit('speakAll')"
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
    >
      <Play class="w-3.5 h-3.5 fill-current" />
      Read All
    </button>
  </div>
</template>
