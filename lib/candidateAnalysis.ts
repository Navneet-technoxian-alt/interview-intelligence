import type { Candidate, Mission } from "./types";

// Derived, per docs/ARCHITECTURE.md §4. Every field here is computed only
// from fields present in data/candidate-profiles.json for this candidate -
// nothing is shared across candidates, which is what makes the resulting
// interview plan personalized (Hackathon Acceptance Gate: personalization).
export interface CandidateSignals {
  skippedDays: number[];
  failedDays: number[];
  struggledDays: number[];
  strongDays: number[];
  firstTryRatio: number;
}

function hasPassed(mission: Mission): mission is Extract<Mission, { passed: boolean }> {
  return "passed" in mission;
}

export function analyzeCandidate(candidate: Candidate): CandidateSignals {
  const skippedDays: number[] = [];
  const failedDays: number[] = [];
  const struggledDays: number[] = [];
  const strongDays: number[] = [];

  const passedOrFailed = candidate.missions.filter(hasPassed);
  const avgAttempts =
    passedOrFailed.length > 0
      ? passedOrFailed.reduce((sum, m) => sum + m.attempts, 0) / passedOrFailed.length
      : 0;

  for (const mission of candidate.missions) {
    if ("skipped" in mission && mission.skipped) {
      skippedDays.push(mission.day);
      continue;
    }
    if (hasPassed(mission)) {
      if (!mission.passed) {
        failedDays.push(mission.day);
      } else if (mission.attempts === 1) {
        strongDays.push(mission.day);
      } else if (mission.attempts >= 3 && mission.attempts > avgAttempts) {
        struggledDays.push(mission.day);
      }
    }
  }

  const firstTryRatio =
    candidate.signals.missionsCompleted > 0
      ? candidate.signals.missionsFirstTry / candidate.signals.missionsCompleted
      : 0;

  return { skippedDays, failedDays, struggledDays, strongDays, firstTryRatio };
}
