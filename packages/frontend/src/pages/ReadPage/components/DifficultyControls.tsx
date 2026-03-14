import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface DifficultyControlsProps {
  difficulty: string;
  isSimplifying: boolean;
  isMakingHarder: boolean;
  onSimplify: () => void;
  onHarder: () => void;
}

export function DifficultyControls({
  difficulty,
  isSimplifying,
  isMakingHarder,
  onSimplify,
  onHarder,
}: DifficultyControlsProps) {
  return (
    <div className="card p-4 mt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Adjust difficulty:</span>
        <div className="flex gap-2">
          <button
            onClick={onSimplify}
            disabled={isSimplifying || difficulty === "beginner"}
            className="btn btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSimplifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Simplify
              </>
            )}
          </button>
          <button
            onClick={onHarder}
            disabled={isMakingHarder || difficulty === "advanced"}
            className="btn btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMakingHarder ? (
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
  );
}
