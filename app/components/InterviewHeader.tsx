import React from 'react';

type InterviewHeaderProps = {
  candidateName: string;
  candidateRole: string;
  questionNumber: number;
  totalQuestions?: number; // optional if known
  currentDay?: string;
  onEnd: () => void;
};

export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
  candidateName,
  candidateRole,
  questionNumber,
  totalQuestions,
  currentDay,
  onEnd,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-slate-200 border-b border-slate-700/60 pb-4 mb-4 gap-4 sticky top-0 bg-slate-900/95 z-10 py-2">
      <div className="flex flex-col">
        <h2 className="text-xl font-bold tracking-tight">Interview Intelligence</h2>
        <p className="text-sm text-slate-400 mt-1">
          <span className="font-medium text-slate-300">{candidateName}</span> <span className="mx-1">·</span> {candidateRole}
        </p>
      </div>
      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto space-y-0 sm:space-y-1 text-sm text-slate-400">
        <div className="flex items-center gap-3">
          {currentDay && <span className="bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700/50">{currentDay}</span>}
          <span>
            {totalQuestions ? `Q${questionNumber}/${totalQuestions}` : `Q${questionNumber}`}
          </span>
        </div>
        <button
          onClick={onEnd}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          End Interview
        </button>
      </div>
    </div>
  );
};
