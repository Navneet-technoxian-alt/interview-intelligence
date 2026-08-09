// app/page.tsx – Interview Agent UI (Polished)
'use client';
import { useState, FormEvent } from 'react';
import { Candidate, Feedback, InterviewResponseBody, InProgressResponseBody, FinalResponseBody } from '@/lib/types';
import { allCandidates } from '@/lib/data';

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
    if (!input.trim() || !sessionId) return;
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

  const reset = () => {
    setStage('select');
    setCandidate(null);
    setSessionId('');
    setMessages([]);
    setFeedback(null);
    setInput('');
    setLoading(false);
  };

  // ---------- Rendering helpers ----------
  const renderSelection = () => (
    <div className="max-w-3xl w-full space-y-8 text-gray-100">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">Interview Intelligence</h1>
        <p className="text-xl font-medium">Build the interviewer, not the interview.</p>
        <p className="text-sm text-gray-400">An adaptive technical interview built around your learning journey.</p>
        <div className="inline-block bg-indigo-700 text-white text-xs font-semibold px-2 py-1 rounded mt-2">
          AI TECHNICAL INTERVIEW AGENT
        </div>
      </div>

      {/* Candidate cards */}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allCandidates.map((c) => {
          const { failed, skipped } = computeMissionStats(c);
          return (
            <li
              key={c.member.id}
              className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer border border-gray-600"
              onClick={() => startInterview(c)}
            >
              <h2 className="text-lg font-semibold mb-1">{c.member.name}</h2>
              <p className="text-sm text-gray-300 mb-1">
                {c.member.jobRole} – {c.member.yearsExperience} yr(s) experience
              </p>
              <p className="text-sm text-gray-300 mb-1">Completed missions: {c.missions.length}</p>
              <p className="text-sm text-gray-300 mb-1">
                First‑try ratio: {(c.signals.missionsFirstTry / (c.signals.missionsCompleted || 1)).toFixed(2)}
              </p>
              {(failed > 0 || skipped > 0) && (
                <p className="text-sm text-gray-300 mb-1">
                  {failed > 0 && `Failed: ${failed}`}
                  {failed > 0 && skipped > 0 && ', '}
                  {skipped > 0 && `Skipped: ${skipped}`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  const renderInterview = () => {
    const agentMessages = messages.filter((m) => m.role === 'agent');
    const questionNumber = agentMessages.length; // simplistic count
    const lastAgent = agentMessages[agentMessages.length - 1];
    let currentDay = '';
    if (lastAgent) {
      const match = /Day\s+(\d+)/i.exec(lastAgent.text);
      if (match) currentDay = `Day ${match[1]}`;
    }
    return (
      <div className="flex flex-col max-w-3xl w-full h-full space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center text-gray-100">
          <h2 className="text-xl font-bold">TECHNICAL INTERVIEW – {candidate?.member.name}</h2>
          <div className="flex items-center space-x-2 text-sm">
            <span>Question {questionNumber} / 12</span>
            {currentDay && <span>{currentDay}</span>}
            <span className="text-green-400">● Adaptive interviewer</span>
          </div>
          <button onClick={reset} className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm">
            Cancel
          </button>
        </div>
        {/* Conversation */}
        <div className="flex-1 overflow-y-auto bg-gray-800 rounded p-4 space-y-4">
          {messages.map((m, i) => {
            const isAgent = m.role === 'agent';
            const bubbleClass = isAgent ? 'bg-gray-700 text-white' : 'bg-indigo-600 text-white';
            const align = isAgent ? 'text-left' : 'text-right';
            const showFollowUp = isAgent && i > 2; // after first question
            return (
              <div key={i} className={align}>
                <div className={`inline-block max-w-xs rounded-lg p-3 mb-1 ${bubbleClass}`}>
                  {showFollowUp && (
                    <span className="inline-block bg-yellow-600 text-xs text-white px-1 rounded mr-2 mb-1">FOLLOW‑UP</span>
                  )}
                  {m.text}
                </div>
                {isAgent && (
                  <div className="text-xs text-gray-400 mt-0.5 italic">Personalized from your learning journey</div>
                )}
              </div>
            );
          })}
        </div>
        {/* Input */}
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Your response…"
            className="flex-1 px-3 py-2 rounded bg-gray-700 text-white disabled:bg-gray-600"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded disabled:bg-gray-500"
          >
            Send
          </button>
        </form>
        {loading && <div className="text-sm text-gray-400 mt-2">Evaluating response…</div>}
      </div>
    );
  };

  const renderFeedback = () => (
    <div className="max-w-3xl w-full space-y-4 bg-gray-800 rounded p-6 text-gray-100">
      <h2 className="text-2xl font-bold mb-2">Interview Complete</h2>
      <p className="text-lg mb-4">Here's how your technical understanding came across.</p>
      <section className="mb-4">
        <h3 className="font-semibold">Summary</h3>
        <p>{feedback?.summary}</p>
      </section>
      <section className="mb-4">
        <h3 className="font-semibold">What You Did Well</h3>
        <ul className="list-disc list-inside">
          {feedback?.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>
      <section className="mb-4">
        <h3 className="font-semibold">Where to Improve</h3>
        <ul className="list-disc list-inside">
          {feedback?.gaps.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </section>
      <section className="mb-4">
        <h3 className="font-semibold">Next Moves</h3>
        <ul className="list-disc list-inside">
          {feedback?.next.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </section>
      <button
        onClick={reset}
        className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded"
      >
        Start New Interview
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 text-gray-100">
      {stage === 'select' && renderSelection()}
      {stage === 'interview' && candidate && renderInterview()}
      {stage === 'feedback' && feedback && renderFeedback()}
    </div>
  );
}
