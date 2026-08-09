// app/page.tsx – Interview Agent UI (Polished)
'use client';

import { Candidate, Feedback, InterviewResponseBody, InProgressResponseBody, FinalResponseBody } from '@/lib/types';
import { allCandidates } from '@/lib/data';
import { InterviewHeader } from '@/app/components/InterviewHeader';
import { useState, FormEvent, useRef, useEffect } from 'react';

// Helper to detect if response is final
function isFinal(resp: InterviewResponseBody): resp is FinalResponseBody {
  return (resp as FinalResponseBody).done === true && (resp as FinalResponseBody).feedback !== undefined;
}

// Utility to compute counts from candidate missions
function computeMissionStats(candidate: Candidate) {
  const failed = candidate.missions.filter((m) => 'passed' in m && !(m as any).passed).length;
  const skipped = candidate.missions.filter((m) => 'skipped' in m).length;
  return { failed, skipped };
}

export default function InterviewAgent() {
  const [stage, setStage] = useState<'select' | 'interview' | 'feedback'>('select');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'agent' | 'candidate'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation
  useEffect(() => {
    if (stage === 'interview') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, stage]);

  // ---------- Candidate selection ----------
  const startInterview = async (selected: Candidate) => {
    const id = crypto.randomUUID();
    setCandidate(selected);
    setSessionId(id);
    setStage('interview');
    setLoading(true);
    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, candidate: selected }),
      });
      const data: InterviewResponseBody = await response.json();
      setMessages([{ role: 'agent', text: (data as InProgressResponseBody).reply }]);
    } catch (e) {
      alert('Failed to start interview: ' + e);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Conversation ----------
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
  };

  const renderSelection = () => {
    const selectedCandidate = selectedCandidateId
      ? allCandidates.find((c) => c.member.id === selectedCandidateId)
      : null;

    return (
      <div className="max-w-4xl w-full mx-auto space-y-10 py-10 px-4">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-100">Interview Intelligence</h1>
          <p className="text-lg font-medium text-slate-300">Build the interviewer, not the interview.</p>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            An adaptive technical interview built around each candidate's learning journey.
          </p>
        </div>

        {/* Candidate Area */}
        <div className="space-y-6">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allCandidates.map((c) => {
              const { skipped } = computeMissionStats(c);
              const isSelected = selectedCandidateId === c.member.id;

              return (
                <li
                  key={c.member.id}
                  onClick={() => setSelectedCandidateId(c.member.id)}
                  className={`
                    relative bg-slate-800 rounded-lg p-5 cursor-pointer border transition-all duration-200
                    hover:border-slate-600
                    ${
                      isSelected
                        ? 'border-blue-500 bg-slate-800/90 shadow-sm'
                        : 'border-slate-700/50'
                    }
                  `}
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-100">{c.member.name}</h3>
                    <p className="text-sm text-slate-400">
                      {c.member.jobRole} <span className="mx-1">·</span> {c.member.yearsExperience} yr(s) exp
                    </p>
                  </div>

                  <div className="h-px w-full bg-slate-700/50 my-4" />

                  <div className="flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Missions</span>
                      <span className="font-medium text-slate-300">{c.missions.length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5">First-Try</span>
                      <span className="font-medium text-slate-300">
                        {((c.signals.missionsFirstTry / (c.signals.missionsCompleted || 1)) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Skipped</span>
                      <span className="font-medium text-slate-300">{skipped}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Primary Action */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => selectedCandidate && startInterview(selectedCandidate)}
              disabled={!selectedCandidate}
              className={`
                px-8 py-3 rounded-md font-medium transition-colors
                ${
                  selectedCandidate
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInterview = () => {
    const agentMessages = messages.filter((m) => m.role === 'agent');
    const questionNumber = agentMessages.length;
    const lastAgent = agentMessages[agentMessages.length - 1];
    let currentDay = '';
    if (lastAgent) {
      const match = /Day\s+(\d+)/i.exec(lastAgent.text);
      if (match) currentDay = `Day ${match[1]}`;
    }

    return (
      <div className="flex flex-col max-w-4xl w-full h-[100dvh] mx-auto bg-slate-900 border-x border-slate-800">
        <div className="px-4 pt-4 shrink-0">
          <InterviewHeader
            candidateName={candidate?.member.name ?? ''}
            candidateRole={candidate?.member.jobRole ?? ''}
            questionNumber={questionNumber}
            currentDay={currentDay}
            onEnd={reset}
          />
        </div>
        
        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((m, i) => {
            const isAgent = m.role === 'agent';
            return (
              <div key={i} className={`flex w-full ${isAgent ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] md:max-w-[75%] space-y-1 ${isAgent ? 'order-1' : 'order-2'}`}>
                  <div className={`text-[10px] font-bold tracking-wider uppercase text-slate-500 ${isAgent ? 'text-left' : 'text-right'}`}>
                    {isAgent ? 'INTERVIEWER' : 'YOU'}
                  </div>
                  <div 
                    className={`
                      px-4 py-3 rounded-lg text-sm md:text-base leading-relaxed
                      ${isAgent 
                        ? 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none' 
                        : 'bg-blue-600 text-white rounded-tr-none'
                      }
                    `}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start w-full">
              <div className="max-w-[85%] md:max-w-[75%] space-y-1">
                <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500 text-left">
                  INTERVIEWER
                </div>
                <div className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700/50 text-slate-400 text-sm flex items-center gap-2 rounded-tl-none">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse animation-delay-200">●</span>
                  <span className="animate-pulse animation-delay-400">●</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 p-4 bg-slate-900 border-t border-slate-800">
          <form onSubmit={sendMessage} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={loading ? 'Waiting for response...' : 'Type your answer here... (Shift+Enter for new line)'}
              className="flex-1 px-4 py-3 rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-[56px] max-h-[150px] disabled:opacity-50"
              rows={1}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end h-[56px]"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderFeedback = () => (
    <div className="max-w-3xl w-full mx-auto p-4 py-10 space-y-8">
      <div className="space-y-2 border-b border-slate-700/60 pb-6">
        <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Interview Report</h2>
        <p className="text-slate-400">Feedback and analysis for <span className="text-slate-300 font-medium">{candidate?.member.name}</span></p>
      </div>
      
      <div className="space-y-8 text-slate-300 text-sm md:text-base">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
            Summary
          </h3>
          <p className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/30 leading-relaxed">
            {feedback?.summary}
          </p>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Strengths
          </h3>
          <ul className="space-y-2">
            {feedback?.strengths.map((s, i) => (
              <li key={i} className="flex gap-3 bg-slate-800/30 p-3 rounded-md border border-slate-700/20">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
            Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {feedback?.gaps.map((g, i) => (
              <li key={i} className="flex gap-3 bg-slate-800/30 p-3 rounded-md border border-slate-700/20">
                <span className="text-amber-500 mt-0.5">!</span>
                <span className="leading-relaxed">{g}</span>
              </li>
            ))}
          </ul>
        </section>
        
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
            Next Steps
          </h3>
          <ul className="space-y-2">
            {feedback?.next.map((n, i) => (
              <li key={i} className="flex gap-3 bg-slate-800/30 p-3 rounded-md border border-slate-700/20">
                <span className="text-blue-500 mt-0.5">→</span>
                <span className="leading-relaxed">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="pt-8 border-t border-slate-700/60">
        <button
          onClick={reset}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-6 py-2.5 rounded-md font-medium transition-colors border border-slate-600"
        >
          Return to Candidate Selection
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-900 text-slate-200">
      {stage === 'select' && renderSelection()}
      {stage === 'interview' && candidate && renderInterview()}
      {stage === 'feedback' && feedback && renderFeedback()}
    </div>
  );
}
