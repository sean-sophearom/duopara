import { Play, Square } from "lucide-react";

interface PlaybackControlsProps {
  isSpeaking: boolean;
  speechRate: number;
  onSpeakAll: () => void;
  onStop: () => void;
  onRateChange: (rate: number) => void;
}

export function PlaybackControls({
  isSpeaking,
  speechRate,
  onSpeakAll,
  onStop,
  onRateChange,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
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
