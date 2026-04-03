import { BookOpen } from "lucide-react";

interface ReadingStatsProps {
  newWordsCount: number;
  markedWordsCount: number;
  language: string;
}

export function ReadingStats({ newWordsCount, markedWordsCount, language }: ReadingStatsProps) {
  return (
    <div className="card p-4 mt-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            <span className="text-primary-600 font-medium">{newWordsCount}</span> new words
          </span>
          <span className="text-gray-600">
            <span className="text-green-600 font-medium">{markedWordsCount}</span> marked as learned
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <BookOpen className="w-4 h-4" />
          <span>{language}</span>
        </div>
      </div>
    </div>
  );
}
