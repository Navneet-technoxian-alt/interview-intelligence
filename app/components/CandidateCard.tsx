import React from 'react';
import type { Candidate } from '@/lib/types';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
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

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isSelected,
  onSelect,
}) => {
  const { skipped, firstTryPct, completed } = computeStats(candidate);
  const c = candidate.member;

  return (
    <li
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="relative cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-150"
      style={{
        background: isSelected ? '#1e2536' : '#161b27',
        border: `1px solid ${isSelected ? '#3b82f6' : '#2a3347'}`,
        listStyle: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = '#3b4560';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = '#2a3347';
        }
      }}
    >
      {/* Selected indicator bar */}
      {isSelected && (
        <div
          className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
          style={{ background: '#3b82f6' }}
        />
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: '#e6edf3' }}
            >
              {c.name}
            </h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#8b949e' }}>
              {c.jobRole}
            </p>
          </div>
          <span
            className="flex-shrink-0 text-xs px-2 py-0.5 rounded font-medium"
            style={{ background: '#0d1117', color: '#8b949e', border: '1px solid #2a3347' }}
          >
            {c.yearsExperience}y exp
          </span>
        </div>

        {/* Divider */}
        <div className="my-4" style={{ height: 1, background: '#1e2536' }} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>
              Missions
            </p>
            <p className="text-sm font-semibold" style={{ color: '#c9d1d9' }}>
              {candidate.missions.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>
              First-Try
            </p>
            <p className="text-sm font-semibold" style={{ color: firstTryPct >= 70 ? '#22c55e' : firstTryPct >= 40 ? '#f59e0b' : '#c9d1d9' }}>
              {firstTryPct}%
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#8b949e' }}>
              Skipped
            </p>
            <p className="text-sm font-semibold" style={{ color: skipped > 0 ? '#f59e0b' : '#c9d1d9' }}>
              {skipped}
            </p>
          </div>
        </div>

        {/* Completion bar: visual only, derived from real data */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#8b949e' }}>
              Completed
            </span>
            <span className="text-[10px]" style={{ color: '#8b949e' }}>
              {completed}/{candidate.missions.length}
            </span>
          </div>
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: '#0d1117' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${candidate.missions.length > 0 ? Math.round((completed / candidate.missions.length) * 100) : 0}%`,
                background: isSelected ? '#3b82f6' : '#3b4560',
              }}
            />
          </div>
        </div>
      </div>
    </li>
  );
};
