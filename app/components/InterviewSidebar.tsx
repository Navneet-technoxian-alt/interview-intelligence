import React from 'react';
import type { Candidate } from '@/lib/types';

interface InterviewSidebarProps {
  candidate: Candidate;
  questionNumber: number;
  totalQuestions: number;
  currentDay: string;
  onEnd: () => void;
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

export const InterviewSidebar: React.FC<InterviewSidebarProps> = ({
  candidate,
  questionNumber,
  totalQuestions,
  currentDay,
  onEnd,
}) => {
  const { skipped, failed, firstTryPct, completed, completionPct, total } = computeStats(candidate);
  const c = candidate.member;

  // Interview progress (0–100 based on actual question count)
  const progressPct =
    totalQuestions > 0 ? Math.min(100, Math.round((questionNumber / totalQuestions) * 100)) : 0;

  return (
    <aside
      className="w-64 xl:w-72 flex-shrink-0 flex flex-col gap-3"
      aria-label="Interview context"
    >
      {/* Candidate card */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#161b27', border: '1px solid #2a3347' }}
      >
        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: '#8b949e' }}>
          Candidate
        </p>
        <h3 className="text-sm font-semibold leading-snug mb-0.5" style={{ color: '#e6edf3' }}>
          {c.name}
        </h3>
        <p className="text-xs mb-3 leading-snug" style={{ color: '#8b949e' }}>
          {c.jobRole} · {c.yearsExperience}y exp
        </p>

        {/* Stat rows */}
        <div className="space-y-2 mb-3">
          {[
            { label: 'Missions', value: String(total) },
            { label: 'Completed', value: String(completed) },
            { label: 'First-Try', value: `${firstTryPct}%` },
            { label: 'Skipped', value: String(skipped) },
            { label: 'Failed', value: String(failed) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#8b949e' }}>{label}</span>
              <span className="text-xs font-semibold" style={{ color: '#c9d1d9' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Mission progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8b949e' }}>
              Mission Progress
            </span>
            <span className="text-[10px] font-mono" style={{ color: '#8b949e' }}>
              {completed}/{total}
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 3, background: '#0d1117' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${completionPct}%`, background: '#374569' }}
            />
          </div>
        </div>
      </div>

      {/* Session context card */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#161b27', border: '1px solid #2a3347' }}
      >
        <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: '#8b949e' }}>
          Session
        </p>

        <div className="space-y-2.5 mb-4">
          {/* Question counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#8b949e' }}>Question</span>
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded"
              style={{ background: '#0d1117', color: '#3b82f6', border: '1px solid #2a3347' }}
            >
              {totalQuestions > 0
                ? `${questionNumber} / ${totalQuestions}`
                : `#${questionNumber}`}
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

          {/* Adaptive mode */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: '#8b949e' }}>Mode</span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: '#4ade80' }}>
              <span
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#22c55e', display: 'inline-block', flexShrink: 0,
                }}
              />
              Adaptive
            </span>
          </div>
        </div>

        {/* Interview progress bar */}
        {totalQuestions > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#8b949e' }}>
                Interview Progress
              </span>
              <span className="text-[10px]" style={{ color: '#8b949e' }}>{progressPct}%</span>
            </div>
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: 3, background: '#0d1117' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${progressPct}%`, background: '#3b82f6', transition: 'width 0.4s ease' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* End interview */}
      <button
        onClick={onEnd}
        className="w-full text-xs font-medium py-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        style={{
          background: 'transparent',
          border: '1px solid #2a3347',
          color: '#8b949e',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
          (e.currentTarget as HTMLButtonElement).style.borderColor = '#7f1d1d';
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
