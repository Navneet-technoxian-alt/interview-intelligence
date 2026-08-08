// app/page.tsx – Interview Agent UI
'use client';
import { useState, FormEvent } from 'react';
import { Candidate, Feedback, InterviewResponseBody, InProgressResponseBody, FinalResponseBody } from '@/lib/types';
import { allCandidates } from '@/lib/data';

// Type guard for final response
function isFinal(resp: InterviewResponseBody): resp is FinalResponseBody {
  return (resp as FinalResponseBody).done === true && (resp as FinalResponseBody).feedback !== undefined;
}

export default function InterviewAgent() {
  const [stage, setStage] = useState<'select' | 'interview' | 'feedback'>('select');
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Array<{ role: 'agent' | 'candidate'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Start interview – generate sessionId and send initial payload
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

  // Send a turn message
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100 font-sans p-4">
      {stage === 'select' && (
        <div className="max-w-2xl w-full space-y-6">
          <h1 className="text-3xl font-bold text-center mb-4">Select a Candidate</h1>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allCandidates.map((c) => (
              <li
                key={c.member.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer"
                onClick={() => startInterview(c)}
              >
                <h2 className="text-xl font-semibold">{c.member.name}</h2>
                <p>{c.member.jobRole} – {c.member.yearsExperience} yr(s) experience</p>
                <p>Completed missions: {c.missions.length}</p>
                <p>
                  First‑try ratio:{' '}
                  {(c.signals.missionsFirstTry / (c.signals.missionsCompleted || 1)).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {stage === 'interview' && (
        <div className="flex flex-col max-w-2xl w-full h-full space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">Interview – {candidate?.member.name}</h2>
            <button
              onClick={reset}
              className="text-sm bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded"
            >
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-800 rounded p-4 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'agent' ? 'text-left' : 'text-right'}>
                <span
                  className={
                    m.role === 'agent'
                      ? 'inline-block bg-gray-700 text-white px-3 py-2 rounded-lg max-w-xs'
                      : 'inline-block bg-indigo-600 text-white px-3 py-2 rounded-lg max-w-xs'
                  }
                >
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Your response..."
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
        </div>
      )}

      {stage === 'feedback' && feedback && (
        <div className="max-w-2xl w-full space-y-4 bg-gray-800 rounded p-6">
          <h2 className="text-2xl font-bold mb-4">Interview Feedback</h2>
          <section>
            <h3 className="font-semibold">Summary</h3>
            <p>{feedback.summary}</p>
          </section>
          <section>
            <h3 className="font-semibold mt-4">Strengths</h3>
            <ul className="list-disc list-inside">
              {feedback.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mt-4">Gaps</h3>
            <ul className="list-disc list-inside">
              {feedback.gaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mt-4">Next Steps</h3>
            <ul className="list-disc list-inside">
              {feedback.next.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>
          <button
            onClick={reset}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded"
          >
            Start New Interview
          </button>
        </div>
      )}
    </div>
  );
}
