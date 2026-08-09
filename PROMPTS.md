# AI Usage Log: Interview Intelligence

## 1. Project Overview
**Project Name:** Interview Intelligence
**Purpose:** An adaptive platform for conducting technical interviews. The system interacts with candidates through a conversational interface, personalizing questions from curriculum and candidate mission-history data, and producing structured feedback at the end.

## 2. Methodology: AI as a Development Assistant
AI coding assistance was used throughout development, working directly against the project's own supplied files (`curriculum.json`, `candidate-profiles.json`, `technical-specification.md`) rather than from general assumptions. Every generated file was reviewed, type-checked, linted, built, and functionally tested against the real data before being accepted. This log reflects the actual work done in this repository — not a generic or representative summary.

## 3. Actual Development Areas & Prompt Summaries

### Requirements Analysis
AI was asked to read the supplied curriculum, candidate, and technical-spec files and produce `docs/REQUIREMENTS.md` — mandatory requirements, exact endpoints, request/response schemas, and an explicit list of what was *not* specified in the source files, rather than inventing gaps.

### Architecture & Hackathon Acceptance Gates
AI was asked to produce `docs/ARCHITECTURE.md`, encoding the mandatory hackathon requirements (minimum 8 questions, ≥4 curriculum days, adaptive follow-ups, session context, personalization, structured feedback, the exact `POST /api/interview` contract) as explicit, checkable acceptance gates tied to specific design mechanisms.

### Candidate & Curriculum Data Modeling
AI defined TypeScript types (`lib/types.ts`) directly from the shape observed in `data/candidate-profiles.json` and `data/curriculum.json` — including the `Mission` union type (`passed`/`attempts` vs. `skipped`) — and typed loaders (`lib/data.ts`) for both JSON files. No database was introduced.

### Candidate Analysis Logic
AI implemented `lib/candidateAnalysis.ts`, a pure function deriving skipped/failed/struggled/strong curriculum days and a first-try ratio from a single candidate's own mission history. This is rule-based analysis over the supplied JSON, not a machine-learning or LLM-based assessment.

### Interview Planning Logic
AI implemented `lib/interviewPlanner.ts`, which builds a personalized topic queue per candidate and enforces the two hard gates (≥8 questions, ≥4 curriculum days) with explicit fallback logic for sparse candidate profiles.

### Adaptive Conversation Engine & Session State
AI implemented `lib/conversationEngine.ts` and `lib/sessionStore.ts` — an in-memory, `sessionId`-keyed session store, template-based primary/follow-up question generation driven by the current topic and the candidate's previous answer, and end-of-interview feedback generation. **This logic is rule-based (string templates over structured data), not an LLM call** — the backend does not stream from or call any external AI/LLM API.

### `POST /api/interview` Implementation
AI implemented the single required Next.js App Router route handler (`app/api/interview/route.ts`), branching on session existence and payload shape to serve Start / Turn / End responses matching the exact contract in `technical-specification.md`. It performs synchronous request validation and in-memory state lookups — there is no AI/LLM streaming involved.

### Frontend Interview UI & Feedback UI
AI built the candidate-selection, conversation, and feedback screens (`app/page.tsx`, `app/components/FeedbackScreen.tsx`), wired to `POST /api/interview`. The feedback screen renders only `summary`, `strengths`, `gaps`, and `next` as returned by the API. **No numeric scores (e.g., "code correctness," "communication," "problem-solving") were implemented or fabricated** — the API contract doesn't define score fields, and the team explicitly avoided inventing any.

### Debugging, Build & Type Checking
AI resolved real issues encountered during this project: a Next.js 16 `LayoutProps<"/">` typed-route error (fixed by running `next typegen`), and a production build failure caused by `next/font/google` requiring network access unavailable in the build environment (fixed by switching to the system font stack). `npx tsc --noEmit`, `npx eslint .`, and `npx next build` were run and confirmed clean after every change.

### UI Refinement
AI restyled the feedback screen into a dark, glass-card dashboard (navy background, purple/blue accents) using only the existing Tailwind setup and hand-written inline SVG icons — no new dependencies or external images were added, and no CSS transition/animation work was done.

## 4. What Was Not Done
For accuracy, the following are explicitly **not** part of this project and are not claimed above:
- No external LLM/AI API integration or streaming — the interview logic is deterministic and template-based.
- No score/rubric system (correctness, communication, problem-solving, etc.).
- No git or GitHub workflow — the project has no `.git` repository in this environment, and no commits or deployment configuration were made.
- No message slide-in animations or other CSS transition work.
- No timestamp rendering, so no related hydration-mismatch issue arose.
- The project runs on Next.js 16.3.0, not Next.js 15.

## 5. Conclusion
AI assistance accelerated scaffolding, data modeling, rule-based planning/analysis logic, the API route, and UI implementation. All logic was reviewed, type-checked, linted, built, and functionally verified end-to-end against the real candidate and curriculum data before being accepted into the project.

