import { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import type { QuizQuestion } from '../data/vulnerabilities';
import { cn } from './ui/utils';

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = Object.keys(selections).length === questions.length;
  const correctCount = questions.filter(
    (q, i) => selections[i] === q.correctIndex
  ).length;

  const selectOption = useCallback((questionIdx: number, optionIdx: number) => {
    if (submitted) return;
    setSelections((prev) => ({ ...prev, [questionIdx]: optionIdx }));
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    if (allAnswered) setSubmitted(true);
  }, [allAnswered]);

  const reset = useCallback(() => {
    setSelections({});
    setSubmitted(false);
  }, []);

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => {
        const selected = selections[qi];
        const isCorrect = selected === q.correctIndex;

        return (
          <div key={qi} className="space-y-3">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-gradient-to-br from-orange-500/15 to-[#A4005A]/10 dark:from-orange-500/25 dark:to-[#A4005A]/15 text-orange-600 dark:text-orange-400 text-[11px] font-semibold mr-2">
                {qi + 1}
              </span>
              {q.question}
            </p>

            <div className="grid gap-2">
              {q.options.map((option, oi) => {
                const isThisCorrect = oi === q.correctIndex;
                const isThisSelected = selected === oi;

                let optionStyle: string;
                if (submitted) {
                  if (isThisCorrect) {
                    optionStyle = 'border-green-500/40 bg-green-500/10 dark:bg-green-500/15 shadow-sm';
                  } else if (isThisSelected && !isThisCorrect) {
                    optionStyle = 'border-red-500/40 bg-red-500/10 dark:bg-red-500/15';
                  } else {
                    optionStyle = 'border-gray-900/5 dark:border-white/5 opacity-40';
                  }
                } else if (isThisSelected) {
                  optionStyle = 'border-orange-500/40 bg-orange-500/10 dark:bg-orange-500/15 shadow-sm';
                } else {
                  optionStyle = 'glass hover:bg-white/80 dark:hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer';
                }

                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => selectOption(qi, oi)}
                    disabled={submitted}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border border-white/60 dark:border-white/10 text-sm transition-all focus-ring',
                      optionStyle,
                      submitted && 'cursor-default translate-y-0'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-semibold shrink-0 mt-px transition-colors',
                        submitted && isThisCorrect
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                          : submitted && isThisSelected && !isThisCorrect
                          ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                          : isThisSelected
                          ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
                          : 'bg-gray-900/5 dark:bg-white/10 text-muted-foreground'
                      )}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="text-foreground leading-relaxed flex-1">{option}</span>
                      {submitted && isThisCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      )}
                      {submitted && isThisSelected && !isThisCorrect && (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className={cn(
                'text-xs leading-relaxed px-4 py-3 rounded-xl border',
                isCorrect
                  ? 'border-green-500/20 bg-green-500/5 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'border-red-500/20 bg-red-500/5 dark:bg-red-500/10 text-red-700 dark:text-red-400'
              )}>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-4 border-t border-orange-500/10 dark:border-orange-500/10">
        {submitted ? (
          <>
            <div className="text-sm font-medium text-foreground">
              Score:{' '}
              <span className={cn(
                'font-semibold',
                correctCount === questions.length
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-orange-600 dark:text-orange-400'
              )}>
                {correctCount}/{questions.length}
              </span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-gray-900/5 dark:hover:bg-white/10 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">
              {Object.keys(selections).length}/{questions.length} answered
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                allAnswered
                  ? 'bg-gradient-to-r from-orange-600 to-[#A4005A] text-white hover:from-orange-700 hover:to-[#8a004c] shadow-sm'
                  : 'bg-gray-200 dark:bg-white/10 text-muted-foreground cursor-not-allowed'
              )}
            >
              Check Answers
            </button>
          </>
        )}
      </div>
    </div>
  );
}
