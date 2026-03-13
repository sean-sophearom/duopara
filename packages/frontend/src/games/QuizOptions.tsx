interface QuizOptionsProps {
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  currentIndex: number;
  onSelect: (option: string) => void;
  layout?: 'list' | 'grid';
  showLetters?: boolean;
}

export function QuizOptions({
  options,
  selectedAnswer,
  correctAnswer,
  currentIndex,
  onSelect,
  layout = 'list',
  showLetters = true,
}: QuizOptionsProps) {
  const containerClass =
    layout === 'grid'
      ? 'w-full max-w-xl grid grid-cols-2 gap-3'
      : 'w-full max-w-xl space-y-3';

  return (
    <div className={containerClass}>
      {options.map((option, index) => {
        let buttonClass =
          layout === 'grid'
            ? 'p-4 rounded-lg border-2 text-center transition-all '
            : 'w-full p-4 rounded-lg border-2 text-left transition-all ';

        if (selectedAnswer) {
          if (option === correctAnswer) {
            buttonClass += 'border-green-500 bg-green-50 text-green-800';
          } else if (option === selectedAnswer) {
            buttonClass += 'border-red-500 bg-red-50 text-red-800';
          } else {
            buttonClass += 'border-gray-200 bg-gray-50 text-gray-400';
          }
        } else {
          buttonClass +=
            'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
        }

        return (
          <button
            key={`${currentIndex}-${index}`}
            onClick={() => onSelect(option)}
            disabled={!!selectedAnswer}
            className={buttonClass}
          >
            {showLetters && (
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
            )}
            {option}
          </button>
        );
      })}
    </div>
  );
}
