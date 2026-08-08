import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";
import { curriculum } from "@/lib/data";
import { createSession, processTurn } from "@/lib/conversationEngine";
import type { Candidate } from "@/lib/types";

// Minimal shape validation for the candidate object. We don't reject on
// every possible malformed field (no such requirement is specified), but we
// do guard against the object being unusable to the planner/engine.
function isCandidateShaped(value: unknown): value is Candidate {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.member === "object" &&
    v.member !== null &&
    Array.isArray(v.missions) &&
    typeof v.signals === "object" &&
    v.signals !== null
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const { sessionId, candidate, message } = body as {
    sessionId?: unknown;
    candidate?: unknown;
    message?: unknown;
  };

  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return NextResponse.json({ error: "sessionId (string) is required." }, { status: 400 });
  }

  const existing = sessionStore.get(sessionId);

  // ---- Start Interview: no session yet for this sessionId ----
  if (!existing) {
    if (!isCandidateShaped(candidate)) {
      return NextResponse.json(
        {
          error:
            "Unknown sessionId. To start a new interview, include a candidate object matching the candidate-profiles.json schema.",
        },
        { status: 400 }
      );
    }

    const { state, reply } = createSession(sessionId, candidate, curriculum);
    sessionStore.set(sessionId, state);
    return NextResponse.json({ reply, done: false });
  }

  // ---- Conversation Turn: session already exists ----
  if (existing.status === "complete") {
    return NextResponse.json(
      { error: "This interview session has already completed." },
      { status: 409 }
    );
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "message (non-empty string) is required to continue an in-progress interview." },
      { status: 400 }
    );
  }

  const result = processTurn(existing, message);
  sessionStore.set(sessionId, existing);

  if (result.done) {
    return NextResponse.json({ reply: result.reply, done: true, feedback: result.feedback });
  }
  return NextResponse.json({ reply: result.reply, done: false });
}
