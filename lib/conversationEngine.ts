import type { Candidate, Curriculum, Feedback } from "./types";
import { buildInterviewPlan, InterviewPlan, PlannedTopic, MIN_QUESTIONS, MIN_CURRICULUM_DAYS } from "./interviewPlanner";
import { analyzeCandidate } from "./candidateAnalysis";

export interface HistoryTurn {
  role: "agent" | "candidate";
  text: string;
  topicDay: number | null;
}

export interface SessionState {
  sessionId: string;
  candidate: Candidate;
  plan: InterviewPlan;
  history: HistoryTurn[];
  topicIndex: number;
  questionsAskedInCurrentTopic: number;
  totalQuestionsAsked: number;
  daysCovered: Set<number>;
  status: "in_progress" | "complete";
  answersByDay: Map<number, string[]>;
}

// ---------- question generation ----------

function reasonPhrase(reason: PlannedTopic["reason"]): string {
  switch (reason) {
    case "failed":
      return " — this is a topic you didn't pass on your first attempt in the program";
    case "skipped":
      return " — you skipped this mission during the program, so let's cover it now";
    case "struggled":
      return " — this took you several attempts in the program, so let's dig in";
    case "strong":
      return " — you passed this on your first try, so let's confirm the depth of that understanding";
    case "never_attempted":
    default:
      return "";
  }
}

function askPrimaryQuestion(topic: PlannedTopic): string {
  const objective = topic.objectives[0];
  const objectivePart = objective ? ` In particular, thinking about "${objective}," ` : " ";
  return `Let's talk about Day ${topic.day}: "${topic.title}"${reasonPhrase(topic.reason)}.${objectivePart}can you walk me through your hands-on experience with this?`;
}

function pickUnaddressedObjective(topic: PlannedTopic, previousAnswers: string[]): string | undefined {
  const combined = previousAnswers.join(" ").toLowerCase();
  return topic.objectives.find((o) => !combined.includes(o.toLowerCase().slice(0, 12)));
}

function generateFollowUp(topic: PlannedTopic, previousAnswer: string, previousAnswers: string[]): string {
  const trimmed = previousAnswer.trim();

  // New rule: if the topic involves chain-of-thought prompting, ask about safe prompting concepts
  const cotRelated = /chain[-\s]?of[-\s]?thought/i.test(topic.title) ||
    topic.objectives.some((obj) => /chain[-\s]?of[-\s]?thought/i.test(obj));
  if (cotRelated) {
    return `You mentioned chain-of-thought prompting. Could you discuss safe prompting practices such as zero-shot, few-shot, or structured prompting?`;
  }

  if (trimmed.length < 15) {
    return `Could you go into more detail on Day ${topic.day} (\"${topic.title}\")? Specifically, what did you actually do, and why?`;
  }

  const mentionedTool = topic.tools.find((tool) => trimmed.toLowerCase().includes(tool.toLowerCase()));
  if (mentionedTool) {
    return `You mentioned ${mentionedTool} — what's a specific challenge you ran into while using ${mentionedTool} for \"${topic.title}\", and how did you resolve it?`;
  }

  const nextObjective = pickUnaddressedObjective(topic, previousAnswers);
  if (nextObjective) {
    return `Building on what you just said, how does that connect to \"${nextObjective}\"?`;
  }

  return `That's helpful. What would you do differently if you approached \"${topic.title}\" again today?`;
}



// ---------- session lifecycle ----------

export function createSession(
  sessionId: string,
  candidate: Candidate,
  curriculum: Curriculum
): { state: SessionState; reply: string } {
  const plan = buildInterviewPlan(candidate, curriculum);

  const state: SessionState = {
    sessionId,
    candidate,
    plan,
    history: [],
    topicIndex: 0,
    questionsAskedInCurrentTopic: 0,
    totalQuestionsAsked: 0,
    daysCovered: new Set(),
    status: "in_progress",
    answersByDay: new Map(),
  };

  const firstTopic = plan.topics[0];
  const question = askPrimaryQuestion(firstTopic);
  const reply = `Welcome, ${candidate.member.name}. Let's begin your interview — it's personalized around your learning journey in the program. ${question}`;

  recordAgentQuestion(state, firstTopic, reply);

  return { state, reply };
}

function recordAgentQuestion(state: SessionState, topic: PlannedTopic, text: string) {
  state.history.push({ role: "agent", text, topicDay: topic.day });
  state.questionsAskedInCurrentTopic += 1;
  state.totalQuestionsAsked += 1;
  state.daysCovered.add(topic.day);
}

export type TurnResult =
  | { done: false; reply: string }
  | { done: true; reply: string; feedback: Feedback };

export function processTurn(state: SessionState, message: string): TurnResult {
  const currentTopic = state.plan.topics[state.topicIndex];

  // Record the candidate's answer against the topic it was answering.
  state.history.push({ role: "candidate", text: message, topicDay: currentTopic.day });
  const existingAnswers = state.answersByDay.get(currentTopic.day) ?? [];
  existingAnswers.push(message);
  state.answersByDay.set(currentTopic.day, existingAnswers);

  const stillFollowingUpOnTopic = state.questionsAskedInCurrentTopic < currentTopic.minQuestions;

  if (stillFollowingUpOnTopic) {
    const followUp = generateFollowUp(currentTopic, message, existingAnswers);
    recordAgentQuestion(state, currentTopic, followUp);
    return { done: false, reply: followUp };
  }

  // Current topic's question budget is spent - advance to the next topic.
  const nextIndex = state.topicIndex + 1;
  const gatesSatisfied =
    state.totalQuestionsAsked >= MIN_QUESTIONS && state.daysCovered.size >= MIN_CURRICULUM_DAYS;

  if (nextIndex < state.plan.topics.length) {
    state.topicIndex = nextIndex;
    state.questionsAskedInCurrentTopic = 0;
    const nextTopic = state.plan.topics[nextIndex];
    const question = askPrimaryQuestion(nextTopic);
    recordAgentQuestion(state, nextTopic, question);
    return { done: false, reply: question };
  }

  if (!gatesSatisfied) {
    // Defensive fallback: the planner guarantees this shouldn't happen, but
    // if it ever does, keep probing the current topic rather than ending
    // the interview short of the mandatory 8-question / 4-day gates.
    currentTopic.minQuestions += 1;
    const followUp = generateFollowUp(currentTopic, message, existingAnswers);
    recordAgentQuestion(state, currentTopic, followUp);
    return { done: false, reply: followUp };
  }

  state.status = "complete";
  const feedback = generateFeedback(state);
  const reply = "Interview completed. Thank you for your time - here is your feedback.";
  return { done: true, reply, feedback };
}

// ---------- feedback generation ----------

function generateFeedback(state: SessionState): Feedback {
  const { candidate } = state;
  const signals = analyzeCandidate(candidate);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const next: string[] = [];

  for (const topic of state.plan.topics) {
    const answers = state.answersByDay.get(topic.day) ?? [];
    const combinedLength = answers.join(" ").trim().length;
    const substantive = combinedLength >= 40;

    if (topic.reason === "failed" || topic.reason === "skipped") {
      gaps.push(
        `Day ${topic.day} ("${topic.title}") — ${topic.reason === "failed" ? "not passed" : "skipped"} during the program${substantive ? "; interview answers showed some recovery" : " and interview answers stayed shallow"}.`
      );
      next.push(`Revisit Day ${topic.day} ("${topic.title}"), focusing on: ${topic.objectives[0] ?? topic.title}.`);
    } else if (topic.reason === "struggled") {
      if (substantive) {
        strengths.push(`Day ${topic.day} ("${topic.title}") — explained this multi-attempt topic with real depth in the interview.`);
      } else {
        gaps.push(`Day ${topic.day} ("${topic.title}") — took multiple attempts in the program and answers here were still brief.`);
        next.push(`Practice explaining the reasoning behind "${topic.title}" (Day ${topic.day}) out loud.`);
      }
    } else if (substantive) {
      strengths.push(`Day ${topic.day} ("${topic.title}") — gave a substantive, confident answer.`);
    } else {
      gaps.push(`Day ${topic.day} ("${topic.title}") — answer lacked depth during the interview.`);
      next.push(`Review Day ${topic.day} ("${topic.title}") objectives: ${topic.objectives[0] ?? topic.title}.`);
    }
  }

  if (strengths.length === 0) {
    strengths.push("Engaged with every topic presented and completed the full interview.");
  }
  if (gaps.length === 0) {
    gaps.push("No significant gaps observed across the curriculum days covered in this interview.");
  }
  if (next.length === 0) {
    next.push("Continue building on current strengths with more advanced curriculum days.");
  }

  const daysList = [...state.daysCovered].sort((a, b) => a - b).join(", ");
  const summary =
    `${candidate.member.name} (${candidate.member.jobRole}) completed a ${state.totalQuestionsAsked}-question interview ` +
    `spanning ${state.daysCovered.size} curriculum days (${daysList}), personalized around their mission history ` +
    `(first-try ratio ${(signals.firstTryRatio * 100).toFixed(0)}%, ${signals.failedDays.length} failed and ${signals.skippedDays.length} skipped missions in the program).`;

  return { summary, strengths, gaps, next };
}
