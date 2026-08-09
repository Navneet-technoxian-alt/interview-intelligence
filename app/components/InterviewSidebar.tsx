import React from 'react';
import type { Candidate } from '@/lib/types';

interface InterviewSidebarProps {
  candidate: Candidate;
  questionNumber: number;
  currentDay: string;
  onEnd: () => void;
}

function computeStats(candidate: Candidate) {
  const skipped = candidate.missions.filter((m) => 'skipped' in m).length;
  const completed = candidate.signals.missionsCompleted;
  const firstTryPct =
    completed > 0
      ? Math.round((candidate.signals.missionsFirstTry / completed) * 100)
      : 0;
  return { skipped, firstTryPct, completed };
}

export const InterviewSidebar: React.FC<InterviewSidebarProps> = ({
  candidate,
  questionNumber,
  currentDay,
  onEnd,
}) => {
  const { skipped, firstTryPct, completed } = computeStats(candidate);
  const c = candidate.member;

  const statRows = [
    { label: 'Role', value: c.jobRole },
    { label: 'Experience', value: `${c.yearsExperience} year${c.yearsExperience !== 1 ? 's' : ''}` },
    { label: 'Missions', value: `${candidate.missions.length}` },
    { label: 'Completed', value: `${completed}` },
    { label: 'First-Try Rate', value: `${firstTryPct}%` },
    { label: 'Skipped', value: `${skipped}` },
  ];

  return (
    <aside
      className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4"
      aria-label="Interview context"
    >
      {/* Candidate context card */}
      <div
        className="rounded-lg p-4"
        style={{ background: '#161b27', border: '1px solid #2a3347' }}
      >
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#8b949e' }}>
            Candidate
          </p>
          <h3 className="text-sm font-semibold" style={{ color: '#e6edf3' }}>
            {c.name}
          </h3>
        </div>

        <div className="space-y-2">
          {statRows.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-2">
              <span className="text-xs flex-shrink-0" style={{ color: '#8b949e' }}>
                {label}
              </span>
              <span
                className="text-xs font-medium text-right truncate"
                style={{ color: '#c9d1d9' }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Mini progress bar */}
        <div className="mt-4">
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: '#0d1117' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${candidate.missions.length > 0 ? Math.round((completed / candidate.missions.length) * 100) : 0}%`,
                background: '#3b82f6',
              }}
            />
          </div>
        </div>
      </div>

      {/* Interview context card */}
      <div
        className="rounded-lg p-4"
        style={{ background: '#161b27', border: '1px solid #2a3347' }}
      >
        <p className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: '#8b949e' }}>
          Session Context
        </p>

        <div className="space-y-3">
          {/* Question counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#8b949e' }}>Question</span>
            <span
              className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
              style={{ background: '#0d1117', color: '#3b82f6', border: '1px solid #2a3347' }}
            >
              #{questionNumber}
            </span>
          </div>

          {/* Current topic */}
          {currentDay ? (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#8b949e' }}>Topic</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: '#1e2536', color: '#93c5fd', border: '1px solid #2a3347' }}
              >
                {currentDay}
              </span>
            </div>
          ) : null}

          {/* Adaptive indicator */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#8b949e' }}>Mode</span>
            <span className="text-xs" style={{ color: '#22c55e' }}>Adaptive</span>
          </div>
        </div>
      </div>

      {/* End interview */}
      <button
        onClick={onEnd}
        className="w-full text-xs font-medium py-2 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        style={{
          background: 'transparent',
          border: '1px solid #2a3347',
          color: '#8b949e',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#e6edf3';
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b4560';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#8b949e';
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a3347';
        }}
      >
        End Interview
      </button>
    </aside>
  );
};
