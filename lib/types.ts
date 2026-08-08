// Shared data types.
// Request/response shapes mirror docs/technical-specification.md exactly.
// Candidate/Curriculum shapes mirror data/candidate-profiles.json and data/curriculum.json.

export type Mission =
  | { day: number; title: string; passed: boolean; attempts: number }
  | { day: number; title: string; skipped: true };

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface CandidateSignalsRaw {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface Candidate {
  member: CandidateMember;
  missions: Mission[];
  signals: CandidateSignalsRaw;
}

export interface CurriculumModule {
  n: number;
  title: string;
  days: number[]; // [startDay, endDay]
}

export interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
}

export interface Curriculum {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}

// ---- API contract (docs/technical-specification.md) ----

export interface StartRequestBody {
  sessionId: string;
  candidate: Candidate;
}

export interface TurnRequestBody {
  sessionId: string;
  message: string;
}

export interface Feedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

export interface InProgressResponseBody {
  reply: string;
  done: false;
}

export interface FinalResponseBody {
  reply: string;
  done: true;
  feedback: Feedback;
}

export type InterviewResponseBody = InProgressResponseBody | FinalResponseBody;
