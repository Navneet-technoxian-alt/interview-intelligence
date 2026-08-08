import type { SessionState } from "./conversationEngine";

// In-memory session store keyed by sessionId, per docs/technical-specification.md
// ("Your agent must expose a single endpoint... maintain interview state using the
// provided sessionId"). Kept on globalThis so it survives Next.js dev-mode hot
// reloads of this module; it does not survive a process restart (see
// docs/ARCHITECTURE.md §8 risks - no persistence requirement is specified).
const globalForSessions = globalThis as unknown as {
  __interviewSessions?: Map<string, SessionState>;
};

export const sessionStore: Map<string, SessionState> =
  globalForSessions.__interviewSessions ?? new Map<string, SessionState>();

globalForSessions.__interviewSessions = sessionStore;
