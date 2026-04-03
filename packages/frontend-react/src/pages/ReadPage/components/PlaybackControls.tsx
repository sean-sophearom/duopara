import { Play, Square, Volume2 } from "lucide-react";
import { formatVoiceName } from "../utils";

interface PlaybackControlsProps {
  isSpeaking: boolean;
  speechRate: number;
  voices: SpeechSynthesisVoice[];
  fallbackVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  onSpeakAll: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
  onVoiceChange: (voice: SpeechSynthesisVoice) => void;
}

export function PlaybackControls({
  isSpeaking,
  speechRate,
  voices,
  fallbackVoices,
  selectedVoice,
  onSpeakAll,
  onStop,
  onRateChange,
  onVoiceChange,
}: PlaybackControlsProps) {
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceURI = e.target.value;
    const allVoices = [...voices, ...fallbackVoices];
    const voice = allVoices.find((v) => v.voiceURI === voiceURI);
    if (voice) {
      onVoiceChange(voice);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Voice selection */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-500" />
        <select
          value={selectedVoice?.voiceURI || ""}
          onChange={handleVoiceChange}
          className="text-sm bg-gray-100 border-0 rounded-lg px-2 py-1.5 pr-8 focus:ring-2 focus:ring-primary-500 cursor-pointer max-w-[200px]"
          title="Select voice"
        >
          {voices.length > 0 && (
            <optgroup label="Matching language">
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {formatVoiceName(voice)}
                </option>
              ))}
            </optgroup>
          )}
          {fallbackVoices.length > 0 && (
            <optgroup label="Other languages">
              {fallbackVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {formatVoiceName(voice)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1 py-1">
        <button
          onClick={() => onRateChange(Math.max(0.5, speechRate - 0.05))}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm font-bold"
          title="Slower"
        >
          −
        </button>
        <span className="w-10 text-center text-xs font-medium text-gray-700 tabular-nums">
          {speechRate.toFixed(2)}×
        </span>
        <button
          onClick={() => onRateChange(Math.min(2.0, speechRate + 0.05))}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm font-bold"
          title="Faster"
        >
          +
        </button>
      </div>
      {/* Read All / Stop */}
      {isSpeaking ? (
        <button
          onClick={onStop}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          Stop
        </button>
      ) : (
        <button
          onClick={onSpeakAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Read All
        </button>
      )}
    </div>
  );
}
