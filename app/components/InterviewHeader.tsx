// InterviewHeader.tsx – kept for API compatibility; not used in main layout
// The interview workspace now uses InterviewSidebar for context.
import React from 'react';

type InterviewHeaderProps = {
  candidateName: string;
  candidateRole: string;
  questionNumber: number;
  totalQuestions?: number;
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
    <div
      className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid #2a3347', color: '#e6edf3' }}
    >
      <div>
        <h2 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>
          {candidateName}
        </h2>
        <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>
          {candidateRole}
          {currentDay && <> · {currentDay}</>}
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: '#8b949e' }}>
        <span>
          {totalQuestions ? `Q${questionNumber}/${totalQuestions}` : `Q${questionNumber}`}
        </span>
        <button
          onClick={onEnd}
          className="transition-colors focus:outline-none"
          style={{ color: '#8b949e' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#8b949e'; }}
        >
          End
        </button>
      </div>
    </div>
  );
};
