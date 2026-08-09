import React from 'react';
import type { Candidate } from '@/lib/types';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: () => void;
}

function computeStats(candidate: Candidate) {
  const skipped = candidate.missions.filter((m) => 'skipped' in m).length;
  const failed = candidate.missions.filter(
    (m) => 'passed' in m && !(m as { passed: boolean }).passed,
  ).length;
  const completed = candidate.signals.missionsCompleted;
  const total = candidate.missions.length;
  const firstTryPct =
    completed > 0
      ? Math.round((candidate.signals.missionsFirstTry / completed) * 100)
      : 0;
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { skipped, failed, firstTryPct, completed, completionPct, total };
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isSelected,
  onSelect,
}) => {
  const { skipped, failed, firstTryPct, completed, completionPct, total } = computeStats(candidate);
  const c = candidate.member;

  // Colour for first-try rate
  const firstTryColor =
    firstTryPct >= 70 ? '#4ade80' : firstTryPct >= 40 ? '#fbbf24' : '#f87171';

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
      className="relative cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all duration-150"
      style={{
        background: isSelected ? '#1a2540' : '#161b27',
        border: `1px solid ${isSelected ? '#3b82f6' : '#2a3347'}`,
        listStyle: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = '#374569';
          (e.currentTarget as HTMLElement).style.background = '#1a2030';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLElement).style.borderColor = '#2a3347';
          (e.currentTarget as HTMLElement).style.background = '#161b27';
        }
      }}
    >
      {/* Selected accent bar */}
      {isSelected && (
        <div
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
          style={{ background: '#3b82f6' }}
        />
      )}

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-tight truncate" style={{ color: '#e6edf3' }}>
              {c.name}
            </h3>
            <p className="text-xs mt-0.5 leading-tight truncate" style={{ color: '#8b949e' }}>
              {c.jobRole}
            </p>
          </div>
          <span
            className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: '#1e2536', color: '#8b949e', border: '1px solid #2a3347' }}
          >
            {c.yearsExperience}y
          </span>
        </div>

        {/* Stats grid: 4 items */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#8b949e' }}>
              Missions
            </p>
            <p className="text-sm font-semibold" style={{ color: '#c9d1d9' }}>
              {total}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#8b949e' }}>
              First-Try
            </p>
            <p className="text-sm font-semibold" style={{ color: firstTryColor }}>
              {firstTryPct}%
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#8b949e' }}>
              Skipped
            </p>
            <p className="text-sm font-semibold" style={{ color: skipped > 0 ? '#fbbf24' : '#8b949e' }}>
              {skipped}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#8b949e' }}>
              Failed
            </p>
            <p className="text-sm font-semibold" style={{ color: failed > 0 ? '#f87171' : '#8b949e' }}>
              {failed}
            </p>
          </div>
        </div>

        {/* Mission progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8b949e' }}>
              Progress
            </span>
            <span className="text-[10px] font-mono" style={{ color: '#8b949e' }}>
              {completed}/{total}
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 3, background: '#1e2536' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${completionPct}%`,
                background: isSelected ? '#3b82f6' : '#374569',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </li>
  );
};
