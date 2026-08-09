'use client';
import React, { useState } from 'react';

type Stage = 'select' | 'interview' | 'feedback';

interface TopNavProps {
  stage: Stage;
  onReset: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ stage, onReset }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Interview', active: stage === 'interview' },
    { label: 'Candidates', active: stage === 'select' },
    { label: 'History', active: false },
  ];

  return (
    <nav
      style={{ background: '#161b27', borderBottom: '1px solid #2a3347' }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Wordmark */}
          <button
            onClick={onReset}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            aria-label="Interview Intelligence — go to candidate selection"
          >
            {/* Simple geometric mark */}
            <div
              className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center"
              style={{ background: '#3b82f6' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.55" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.3" />
              </svg>
            </div>
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: '#e6edf3' }}
            >
              Interview Intelligence
            </span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={link.label === 'Candidates' ? onReset : undefined}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{
                  color: link.active ? '#e6edf3' : '#8b949e',
                  background: link.active ? '#1e2536' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!link.active) e.currentTarget.style.color = '#c9d1d9';
                }}
                onMouseLeave={(e) => {
                  if (!link.active) e.currentTarget.style.color = '#8b949e';
                }}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Stage pill (desktop) */}
          <div className="hidden sm:flex items-center gap-3">
            {stage === 'interview' && (
              <span
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: '#1e2536', color: '#60a5fa', border: '1px solid #2a3347' }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22c55e',
                    display: 'inline-block',
                    boxShadow: '0 0 0 2px #16a34a22',
                  }}
                />
                Live Session
              </span>
            )}
            {stage === 'feedback' && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ background: '#1e2536', color: '#8b949e', border: '1px solid #2a3347' }}
              >
                Interview Complete
              </span>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded focus:outline-none"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{ color: '#8b949e' }}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="sm:hidden pb-3 space-y-1"
            style={{ borderTop: '1px solid #2a3347' }}
          >
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  if (link.label === 'Candidates') onReset();
                  setMobileOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded text-sm font-medium"
                style={{
                  color: link.active ? '#e6edf3' : '#8b949e',
                  background: link.active ? '#1e2536' : 'transparent',
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};
