import type { Candidate, Curriculum, CurriculumDay } from "./types";
import { analyzeCandidate } from "./candidateAnalysis";

// Hard hackathon acceptance gates (docs/ARCHITECTURE.md "Hackathon Acceptance Gates").
export const MIN_QUESTIONS = 8;
export const MIN_CURRICULUM_DAYS = 4;
const QUESTIONS_PER_TOPIC = 2;
const MAX_TOPICS = 6;

export type TopicReason =
  | "failed"
  | "skipped"
  | "struggled"
  | "never_attempted"
  | "strong";

export interface PlannedTopic {
  day: number;
  title: string;
  objectives: string[];
  tools: string[];
  reason: TopicReason;
  minQuestions: number;
}

export interface InterviewPlan {
  topics: PlannedTopic[];
}

/**
 * Builds a personalized, gate-satisfying interview plan for one candidate.
 *
 * Personalization (gate): topic selection is driven entirely by this
 * candidate's own mission history (failed / skipped / struggled / never
 * attempted / first-try strengths), so two different candidates produce two
 * different plans.
 *
 * Coverage gate: guarantees at least MIN_CURRICULUM_DAYS distinct days.
 * Length gate: guarantees total planned questions >= MIN_QUESTIONS.
 *
 * Ordering: topics are selected by signal-priority (weakest signal first) but
 * the final list is sorted in ascending curriculum-day order so the interview
 * always progresses chronologically (Day 1 → Day 2 → … → Day N).
 * Within each signal group days are also sorted ascending before selection
 * so the priority queue itself is deterministic.
 */
export function buildInterviewPlan(candidate: Candidate, curriculum: Curriculum): InterviewPlan {
  const dayLookup = new Map<number, CurriculumDay>(curriculum.days.map((d) => [d.day, d]));
  const signals = analyzeCandidate(candidate);

  const attemptedDays = new Set(candidate.missions.map((m) => m.day));
  const neverAttemptedDays = curriculum.days
    .map((d) => d.day)
    .filter((day) => !attemptedDays.has(day));

  // Helper: sort a list of day numbers ascending before building the priority queue.
  // This makes within-group ordering deterministic and chronological even before
  // the final sort below.
  const sortAsc = (days: number[]) => [...days].sort((a, b) => a - b);

  // Priority order: weakest signal first, per docs/ARCHITECTURE.md §5.
  // Each group is sorted ascending by day so selection within a group is stable.
  const priorityOrder: { day: number; reason: TopicReason }[] = [
    ...sortAsc(signals.failedDays).map((day) => ({ day, reason: "failed" as const })),
    ...sortAsc(signals.skippedDays).map((day) => ({ day, reason: "skipped" as const })),
    ...sortAsc(signals.struggledDays).map((day) => ({ day, reason: "struggled" as const })),
    ...sortAsc(neverAttemptedDays).map((day) => ({ day, reason: "never_attempted" as const })),
    ...sortAsc(signals.strongDays).map((day) => ({ day, reason: "strong" as const })),
  ];

  const seenDays = new Set<number>();
  const topics: PlannedTopic[] = [];

  for (const candidateTopic of priorityOrder) {
    if (seenDays.has(candidateTopic.day)) continue;
    const dayInfo = dayLookup.get(candidateTopic.day);
    if (!dayInfo) continue; // candidate references a day absent from curriculum.json - skip rather than guess
    seenDays.add(candidateTopic.day);
    topics.push({
      day: dayInfo.day,
      title: dayInfo.title,
      objectives: dayInfo.objectives,
      tools: dayInfo.tools,
      reason: candidateTopic.reason,
      minQuestions: QUESTIONS_PER_TOPIC,
    });
    if (topics.length >= MAX_TOPICS && seenDays.size >= MIN_CURRICULUM_DAYS) break;
  }

  // Coverage gate fallback: if the candidate's own signals didn't yield
  // enough distinct days (e.g. a very sparse profile), fill remaining slots
  // from the full curriculum in day order until the gate is satisfied.
  if (seenDays.size < MIN_CURRICULUM_DAYS) {
    for (const dayInfo of curriculum.days) {
      if (seenDays.size >= MIN_CURRICULUM_DAYS) break;
      if (seenDays.has(dayInfo.day)) continue;
      seenDays.add(dayInfo.day);
      topics.push({
        day: dayInfo.day,
        title: dayInfo.title,
        objectives: dayInfo.objectives,
        tools: dayInfo.tools,
        reason: "never_attempted",
        minQuestions: QUESTIONS_PER_TOPIC,
      });
    }
  }

  // ── Chronological sort ──────────────────────────────────────────────────
  // Re-order the selected topics by ascending curriculum day so the interview
  // always progresses forward (Day 1 → Day 2 → … → Day N).
  // Personalization is fully preserved: the set of topics and the per-topic
  // reason labels are unchanged — only the traversal order is made chronological.
  topics.sort((a, b) => a.day - b.day);

  // Length gate: top up minQuestions round-robin until the total reaches
  // MIN_QUESTIONS. With >= MIN_CURRICULUM_DAYS topics at 2 questions each
  // this is already satisfied in the common case; the loop is a defensive
  // guarantee for any future change to QUESTIONS_PER_TOPIC / MAX_TOPICS.
  let totalQuestions = topics.reduce((sum, t) => sum + t.minQuestions, 0);
  let i = 0;
  while (totalQuestions < MIN_QUESTIONS && topics.length > 0) {
    topics[i % topics.length].minQuestions += 1;
    totalQuestions += 1;
    i += 1;
  }

  return { topics };
}
