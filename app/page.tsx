// app/page.tsx – Interview Intelligence Dashboard
'use client';

import {
  Candidate,
  Feedback,
  InterviewResponseBody,
  InProgressResponseBody,
  FinalResponseBody,
} from '@/lib/types';
import { allCandidates } from '@/lib/data';
import { TopNav } from '@/app/components/TopNav';
import { CandidateCard } from '@/app/components/CandidateCard';
import { InterviewSidebar } from '@/app/components/InterviewSidebar';
import { useState, FormEvent, useRef, useEffect } from 'react';

// ── helpers ────────────────────────────────────────────────────────────────

function isFinal(resp: InterviewResponseBody): resp is FinalResponseBody {
  return (
    (resp as FinalResponseBody).done === true &&
    (resp as FinalResponseBody).feedback !== undefined
  );
}

function extractCurrentDay(text: string): string {
  const match = /Day\s+(\d+)/i.exec(text);
  return match ? `Day ${match[1]}` : '';
}

// Derive the total planned question count from the API's welcome reply.
// The conversationEngine currently doesn't expose it in the API response,
// so we fall back to the planner's guaranteed minimum (8) as a floor.
// If the API ever adds a `totalQuestions` field this is the place to read it.
const MIN_PLANNED_QUESTIONS = 8;

// ── overview stats (selection screen) ─────────────────────────────────────

function computeOverviewStats() {
  const totalCandidates = allCandidates.length;
  const totalMissions = allCandidates.reduce((s, c) => s + c.missions.length, 0);
  const avgFirstTry =
    allCandidates.length > 0
      ? Math.round(
          (allCandidates.reduce((s, c) => {
            const comp = c.signals.missionsCompleted;
            return s + (comp > 0 ? c.signals.missionsFirstTry / comp : 0);
          }, 0) /
            allCandidates.length) *
            100,
        )
      : 0;
  return { totalCandidates, totalMissions, avgFirstTry };
}

const { totalCandidates, totalMissions, avgFirstTry } = computeOverviewStats();

// ── stat tile (module-level so ESLint is satisfied) ───────────────────────

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="flex-1 min-w-[130px] rounded-xl px-4 py-3.5"
      style={{ background: '#161b27', border: '1px solid #2a3347' }}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8b949e' }}>
        {label}
      </p>
      <p className="text-xl font-bold tracking-tight" style={{ color: '#e6edf3' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] mt-0.5" style={{ color: '#8b949e' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── component ──────────────────────────────────────────────────────────────

export default function InterviewAgent() {
  const [stage, setStage] = useState<'select' | 'interview' | 'feedback'>('select');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'agent' | 'candidate'; text: string }>>(
    [],
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  // Total questions planned — exposed by the API only after interview starts.
  // We use MIN_PLANNED_QUESTIONS as a known lower bound until the API exposes it.
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  // Track final question count for the feedback report
  const [finalQuestionCount, setFinalQuestionCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation
  useEffect(() => {
    if (stage === 'interview') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, stage]);

  // ── API calls ─────────────────────────────────────────────────────────

  const startInterview = async (selected: Candidate) => {
    const id = crypto.randomUUID();
    setCandidate(selected);
    setSessionId(id);
    setStage('interview');
    setLoading(true);
    // Reset progress state for this session
    setTotalQuestions(0);
    setFinalQuestionCount(0);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, candidate: selected }),
      });
      const data: InterviewResponseBody = await response.json();
      setMessages([{ role: 'agent', text: (data as InProgressResponseBody).reply }]);
      // If the API exposes a totalQuestions field in the future, read it here.
      // For now, fall back to the guaranteed minimum so the progress bar shows.
      setTotalQuestions(MIN_PLANNED_QUESTIONS);
    } catch (e) {
      alert('Failed to start interview: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sessionId || loading) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'candidate', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg }),
      });
      const data: InterviewResponseBody = await response.json();
      setMessages((prev) => [...prev, { role: 'agent', text: data.reply }]);
      if (isFinal(data)) {
        // Record how many agent questions were asked before ending
        const agentCount = messages.filter((m) => m.role === 'agent').length + 1;
        setFinalQuestionCount(agentCount);
        setFeedback(data.feedback);
        setStage('feedback');
      }
    } catch (err) {
      alert('Error communicating with interview API: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as unknown as FormEvent);
    }
  };

  const reset = () => {
    setStage('select');
    setCandidate(null);
    setSessionId('');
    setMessages([]);
    setFeedback(null);
    setInput('');
    setLoading(false);
    setSelectedCandidateId(null);
    setTotalQuestions(0);
    setFinalQuestionCount(0);
  };

  // ── derived state ────────────────────────────────────────────────────

  const agentMessages = messages.filter((m) => m.role === 'agent');
  const questionNumber = agentMessages.length;
  const lastAgentText = agentMessages[agentMessages.length - 1]?.text ?? '';
  const currentDay = extractCurrentDay(lastAgentText);
  const selectedCandidate = selectedCandidateId
    ? allCandidates.find((c) => c.member.id === selectedCandidateId) ?? null
    : null;

  // Progress percentage for the interview panel header bar
  const interviewProgressPct =
    totalQuestions > 0 ? Math.min(100, Math.round((questionNumber / totalQuestions) * 100)) : 0;

  // ── render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: '#0d1117', color: '#e6edf3' }}>
      <TopNav stage={stage} onReset={reset} />

      {/* ════════════════════════════════════════════════════════════════
          CANDIDATE SELECTION / DASHBOARD
      ════════════════════════════════════════════════════════════════ */}
      {stage === 'select' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 md:py-10">

          {/* Page header */}
          <div className="mb-6">
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1.5"
              style={{ color: '#3b82f6' }}
            >
              Adaptive Technical Interview Agent
            </p>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1
                  className="text-2xl md:text-[28px] font-bold tracking-tight leading-tight"
                  style={{ color: '#e6edf3' }}
                >
                  Dashboard
                </h1>
                <p className="mt-1.5 text-sm" style={{ color: '#8b949e', maxWidth: '40rem' }}>
                  Select a candidate to begin an adaptive interview. Each session is personalized
                  around their mission history and curriculum progress.
                </p>
              </div>
              <button
                onClick={() => selectedCandidate && startInterview(selectedCandidate)}
                disabled={!selectedCandidate}
                className="flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
                style={{
                  background: selectedCandidate ? '#3b82f6' : '#161b27',
                  color: selectedCandidate ? '#ffffff' : '#4b5563',
                  cursor: selectedCandidate ? 'pointer' : 'not-allowed',
                  border: selectedCandidate ? 'none' : '1px solid #2a3347',
                }}
                onMouseEnter={(e) => {
                  if (selectedCandidate)
                    (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  if (selectedCandidate)
                    (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
                }}
              >
                {selectedCandidate
                  ? `Start Interview — ${selectedCandidate.member.name.split(' ')[0]}`
                  : 'Start Interview'}
              </button>
            </div>
          </div>

          {/* Overview stat strip — real data only */}
          <div className="flex flex-wrap gap-3 mb-7">
            <StatTile
              label="Candidates"
              value={totalCandidates}
              sub="in this cohort"
            />
            <StatTile
              label="Interviews"
              value="Adaptive"
              sub="questions tailored per candidate"
            />
            <StatTile
              label="Avg First-Try Rate"
              value={`${avgFirstTry}%`}
              sub="across all candidates"
            />
            <StatTile
              label="Curriculum Coverage"
              value={`${totalMissions}`}
              sub="total missions tracked"
            />
          </div>

          {/* Divider */}
          <div className="mb-5" style={{ height: 1, background: '#2a3347' }} />

          {/* Section label */}
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: '#8b949e' }}
            >
              Candidates — {allCandidates.length}
            </h2>
            {selectedCandidate && (
              <span className="text-xs" style={{ color: '#8b949e' }}>
                Selected:{' '}
                <span style={{ color: '#93c5fd' }}>{selectedCandidate.member.name}</span>
              </span>
            )}
          </div>

          {/* Candidate grid */}
          <ul
            role="radiogroup"
            aria-label="Candidate selection"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6"
          >
            {allCandidates.map((c) => (
              <CandidateCard
                key={c.member.id}
                candidate={c}
                isSelected={selectedCandidateId === c.member.id}
                onSelect={() => setSelectedCandidateId(c.member.id)}
              />
            ))}
          </ul>

          {/* Bottom CTA */}
          {selectedCandidate && (
            <div
              className="p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              style={{ background: '#161b27', border: '1px solid #3b82f6' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: '#e6edf3' }}>
                  Ready to interview{' '}
                  <span style={{ color: '#93c5fd' }}>{selectedCandidate.member.name}</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#8b949e' }}>
                  Questions will be tailored to their mission history and learning gaps.
                </p>
              </div>
              <button
                onClick={() => startInterview(selectedCandidate)}
                className="flex-shrink-0 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                style={{ background: '#3b82f6', color: '#ffffff' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
                }}
              >
                Start Interview →
              </button>
            </div>
          )}
        </main>
      )}

      {/* ════════════════════════════════════════════════════════════════
          INTERVIEW WORKSPACE
      ════════════════════════════════════════════════════════════════ */}
      {stage === 'interview' && candidate && (
        <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 md:py-5 gap-4 min-h-0">

          {/* Mobile context bar */}
          <div
            className="lg:hidden flex items-center justify-between px-3 py-2 rounded-lg text-xs"
            style={{ background: '#161b27', border: '1px solid #2a3347' }}
          >
            <span style={{ color: '#8b949e' }}>
              <span style={{ color: '#e6edf3', fontWeight: 600 }}>{candidate.member.name}</span>
              {currentDay && (
                <>
                  {' · '}
                  <span style={{ color: '#93c5fd' }}>{currentDay}</span>
                </>
              )}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono" style={{ color: '#8b949e' }}>
                {totalQuestions > 0 ? `${questionNumber}/${totalQuestions}` : `#${questionNumber}`}
              </span>
              <button
                onClick={reset}
                className="text-xs transition-colors"
                style={{ color: '#8b949e' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#8b949e';
                }}
              >
                End
              </button>
            </div>
          </div>

          {/* Main layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">

            {/* Sidebar (desktop) */}
            <div className="hidden lg:flex flex-col">
              <InterviewSidebar
                candidate={candidate}
                questionNumber={questionNumber}
                totalQuestions={totalQuestions}
                currentDay={currentDay}
                onEnd={reset}
              />
            </div>

            {/* Conversation panel */}
            <div
              className="flex-1 flex flex-col rounded-xl overflow-hidden min-h-0"
              style={{ background: '#161b27', border: '1px solid #2a3347' }}
            >
              {/* Panel header */}
              <div
                className="flex-shrink-0 flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid #2a3347' }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#22c55e', display: 'inline-block', flexShrink: 0,
                    }}
                  />
                  <span className="text-xs font-semibold" style={{ color: '#e6edf3' }}>
                    Live Interview
                  </span>
                  {currentDay && (
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: '#1e2536', color: '#93c5fd', border: '1px solid #2a3347',
                      }}
                    >
                      {currentDay}
                    </span>
                  )}
                </div>

                {/* Progress indicator */}
                <div className="flex items-center gap-3">
                  {totalQuestions > 0 && (
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-xs font-mono" style={{ color: '#8b949e' }}>
                        Q {questionNumber} of {totalQuestions}
                      </span>
                      <div
                        className="rounded-full overflow-hidden"
                        style={{ width: 80, height: 3, background: '#1e2536' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${interviewProgressPct}%`,
                            background: '#3b82f6',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {/* Mobile end */}
                  <button
                    onClick={reset}
                    className="lg:hidden text-xs transition-colors"
                    style={{ color: '#8b949e' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = '#8b949e';
                    }}
                  >
                    End
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-5"
                style={{ minHeight: '280px', maxHeight: 'calc(100dvh - 300px)' }}
              >
                {messages.map((m, i) => {
                  const isAgent = m.role === 'agent';
                  return (
                    <div key={i} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[88%] md:max-w-[78%] space-y-1">
                        <p
                          className="text-[10px] font-bold tracking-wider uppercase"
                          style={{
                            color: '#8b949e',
                            textAlign: isAgent ? 'left' : 'right',
                          }}
                        >
                          {isAgent ? 'Interviewer' : 'You'}
                        </p>
                        <div
                          className="px-4 py-3 rounded-xl text-sm leading-relaxed"
                          style={
                            isAgent
                              ? {
                                  background: '#1e2536',
                                  color: '#c9d1d9',
                                  border: '1px solid #2a3347',
                                  borderTopLeftRadius: 6,
                                }
                              : {
                                  background: '#1e40af',
                                  color: '#dbeafe',
                                  borderTopRightRadius: 6,
                                }
                          }
                        >
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] space-y-1">
                      <p
                        className="text-[10px] font-bold tracking-wider uppercase"
                        style={{ color: '#8b949e' }}
                      >
                        Interviewer
                      </p>
                      <div
                        className="px-4 py-3 rounded-xl flex items-center gap-1.5"
                        style={{
                          background: '#1e2536',
                          border: '1px solid #2a3347',
                          borderTopLeftRadius: 6,
                          color: '#8b949e',
                        }}
                      >
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div
                className="flex-shrink-0 p-3"
                style={{ borderTop: '1px solid #2a3347' }}
              >
                <form onSubmit={sendMessage} className="flex gap-2 items-end">
                  <textarea
                    id="interview-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    placeholder={
                      loading
                        ? 'Waiting for interviewer…'
                        : 'Type your answer… (Enter to send, Shift+Enter for new line)'
                    }
                    rows={2}
                    className="flex-1 text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none disabled:opacity-50"
                    style={{
                      background: '#0d1117',
                      border: '1px solid #2a3347',
                      color: '#e6edf3',
                      minHeight: 56,
                      maxHeight: 140,
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#2a3347';
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed"
                    style={{
                      background: loading || !input.trim() ? '#1e2536' : '#3b82f6',
                      color: loading || !input.trim() ? '#4b5563' : '#ffffff',
                      height: 56,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && input.trim())
                        (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && input.trim())
                        (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
                    }}
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════════════════════════════════════════════
          FEEDBACK / REPORT
      ════════════════════════════════════════════════════════════════ */}
      {stage === 'feedback' && feedback && (
        <main className="flex-1 w-full mx-auto px-4 sm:px-6 py-8 md:py-10" style={{ maxWidth: '52rem' }}>

          {/* Report header */}
          <div className="mb-8 pb-6" style={{ borderBottom: '1px solid #2a3347' }}>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: '#3b82f6' }}
            >
              Interview Complete
            </p>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight mb-1"
              style={{ color: '#e6edf3' }}
            >
              Interview Report
            </h1>
            {candidate && (
              <p className="text-sm" style={{ color: '#8b949e' }}>
                {candidate.member.name}
                <span className="mx-2" style={{ color: '#2a3347' }}>·</span>
                {candidate.member.jobRole}
              </p>
            )}
          </div>

          {/* Meta strip: questions completed + curriculum coverage */}
          {(finalQuestionCount > 0 || totalQuestions > 0) && (
            <div className="flex flex-wrap gap-3 mb-7">
              {finalQuestionCount > 0 && (
                <div
                  className="flex-1 min-w-[140px] rounded-xl px-4 py-3"
                  style={{ background: '#161b27', border: '1px solid #2a3347' }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8b949e' }}>
                    Questions Completed
                  </p>
                  <p className="text-lg font-bold" style={{ color: '#e6edf3' }}>
                    {finalQuestionCount}
                  </p>
                </div>
              )}
              {/* Extract curriculum day count from the feedback summary */}
              {(() => {
                const daysMatch = /spanning\s+(\d+)\s+curriculum\s+days?/i.exec(feedback.summary);
                const daysList = /\(([\d,\s]+)\)/i.exec(feedback.summary);
                if (!daysMatch) return null;
                return (
                  <div
                    className="flex-1 min-w-[140px] rounded-xl px-4 py-3"
                    style={{ background: '#161b27', border: '1px solid #2a3347' }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: '#8b949e' }}>
                      Curriculum Days
                    </p>
                    <p className="text-lg font-bold" style={{ color: '#e6edf3' }}>
                      {daysMatch[1]}
                      {daysList && (
                        <span className="text-xs font-normal ml-1.5" style={{ color: '#8b949e' }}>
                          ({daysList[1].replace(/\s/g, '').split(',').map(Number).sort((a,b)=>a-b).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Report body */}
          <div className="space-y-4">

            {/* Summary */}
            <section
              className="rounded-xl p-5"
              style={{ background: '#161b27', border: '1px solid #2a3347' }}
            >
              <h2
                className="text-[9px] font-bold uppercase tracking-widest mb-3"
                style={{ color: '#8b949e' }}
              >
                Summary
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#c9d1d9' }}>
                {feedback.summary}
              </p>
            </section>

            {/* Strengths */}
            <section
              className="rounded-xl p-5"
              style={{ background: '#161b27', border: '1px solid #2a3347' }}
            >
              <h2
                className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
                style={{ color: '#4ade80' }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#22c55e', display: 'inline-block', flexShrink: 0,
                  }}
                />
                Strengths
              </h2>
              <ul className="space-y-2.5">
                {feedback.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start text-sm leading-relaxed"
                    style={{ color: '#c9d1d9' }}
                  >
                    <span className="flex-shrink-0 mt-0.5 text-xs" style={{ color: '#22c55e' }}>
                      ✓
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>

            {/* Areas for improvement */}
            <section
              className="rounded-xl p-5"
              style={{ background: '#161b27', border: '1px solid #2a3347' }}
            >
              <h2
                className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
                style={{ color: '#fbbf24' }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#f59e0b', display: 'inline-block', flexShrink: 0,
                  }}
                />
                Areas for Improvement
              </h2>
              <ul className="space-y-2.5">
                {feedback.gaps.map((g, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start text-sm leading-relaxed"
                    style={{ color: '#c9d1d9' }}
                  >
                    <span className="flex-shrink-0 mt-0.5 text-xs" style={{ color: '#f59e0b' }}>
                      ▲
                    </span>
                    {g}
                  </li>
                ))}
              </ul>
            </section>

            {/* Next steps */}
            <section
              className="rounded-xl p-5"
              style={{ background: '#161b27', border: '1px solid #2a3347' }}
            >
              <h2
                className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
                style={{ color: '#60a5fa' }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#3b82f6', display: 'inline-block', flexShrink: 0,
                  }}
                />
                Next Steps
              </h2>
              <ul className="space-y-2.5">
                {feedback.next.map((n, i) => (
                  <li
                    key={i}
                    className="flex gap-3 items-start text-sm leading-relaxed"
                    style={{ color: '#c9d1d9' }}
                  >
                    <span
                      className="flex-shrink-0 mt-0.5 font-mono text-xs font-bold"
                      style={{ color: '#3b82f6', minWidth: 20, textAlign: 'right' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {n}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Actions */}
          <div
            className="mt-7 pt-6 flex flex-col sm:flex-row gap-3"
            style={{ borderTop: '1px solid #2a3347' }}
          >
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              style={{ background: '#3b82f6', color: '#ffffff' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3b82f6';
              }}
            >
              New Interview
            </button>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              style={{
                background: 'transparent',
                color: '#8b949e',
                border: '1px solid #2a3347',
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
              Back to Dashboard
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
