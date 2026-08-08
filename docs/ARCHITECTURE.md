# AI Interview Agent — Architecture

Supersedes the earlier "design decision" framing for question count, curriculum coverage, adaptivity, context retention, personalization, and feedback structure. Per Problem Statement 2, the following are **mandatory hackathon requirements**, not optional design choices:

1. Minimum 8 questions.
2. Questions covering at least 4 different curriculum days.
3. Adaptive follow-up questions based on previous responses.
4. Conversation context maintained throughout the interview.
5. Personalized interview based on the candidate's learning journey.
6. Structured feedback at the end.
7. `POST /api/interview` HTTP endpoint (per `technical-spec.md`).

All engine components below are designed so that (1)–(6) are structurally enforced, not left to incidental behavior.

---

## 1. Data Types

### 1.1 API contract (from `technical-specification.md`)

```
StartRequest   = { sessionId: string, candidate: Candidate }
TurnRequest    = { sessionId: string, message: string }
InProgressResp = { reply: string, done: false }
FinalResp      = { reply: string, done: true, feedback: Feedback }
Feedback       = { summary: string, strengths: string[], gaps: string[], next: string[] }
```

### 1.2 Candidate data (from `candidate-profiles.json`)

```
Candidate = {
  member: {
    id: string, name: string, jobRole: string,
    yearsExperience: number, education: string, status: string
  },
  missions: Mission[],
  signals: { commitDays: number, missionsCompleted: number, missionsFirstTry: number }
}

Mission =
    { day: number, title: string, passed: boolean, attempts: number }
  | { day: number, title: string, skipped: true }
```

### 1.3 Curriculum data (from `curriculum.json`)

```
Curriculum = { cohort: string, modules: Module[], days: Day[] }
Module = { n: number, title: string, days: [number, number] }
Day = { day: number, title: string, type: string, tools: string[], objectives: string[] }
```

### 1.4 Internal engine state (required to enforce the hard gates)

```
SessionState = {
  sessionId: string
  candidate: Candidate
  history: Turn[]                 // full conversation, gate #4
  plan: InterviewPlan
  questionsAsked: number          // gate #1 counter
  daysCovered: Set<number>        // gate #2 tracker
  status: "in_progress" | "complete"
}

Turn = { role: "agent" | "candidate", text: string, topicDay: number | null }

InterviewPlan = {
  topics: PlannedTopic[]          // ordered queue, personalized per candidate
  currentIndex: number
}

PlannedTopic = {
  day: number
  title: string
  objectives: string[]            // from curriculum.json Day.objectives
  reason: "skipped" | "failed" | "struggled_high_attempts"
        | "never_attempted" | "first_try_strength"
  minQuestionsForTopic: number    // used to help satisfy gate #1/#2 jointly
}
```

`questionsAsked` and `daysCovered` exist specifically so the engine can check gates #1 and #2 before allowing `done: true`, rather than inferring them after the fact.

---

## 2. API Route Design

Single endpoint, as required by gate #7 and `technical-specification.md`:

```
POST /api/interview
```

No authentication. Branch internally on payload shape + session lookup:

1. No existing session + `candidate` present → initialize `SessionState`, build `InterviewPlan` (§4), return `InProgressResp` (welcome message).
2. Existing session + `message` present → run a Turn (§3), return `InProgressResp` or `FinalResp`.
3. Any other combination (unknown `sessionId` with only `message`, re-sent `candidate` on an existing session, empty `message`) is an edge case — handling must be explicit and documented, not silently guessed (see Risks section, unchanged from prior scope — no new requirement was given for these).

No other routes exist. Adding endpoints beyond `POST /api/interview` is out of scope.

---

## 3. Interview Turn Logic (Context + Adaptivity)

Each Turn request is processed as follows:

1. **Append** the incoming `message` to `SessionState.history` as a `candidate` turn, tagged with the topic day currently active in the plan (gate #4: context retained in full, not summarized or dropped between requests).
2. **Generate the next reply** using:
   - the candidate's **just-submitted message**, and
   - the **current `PlannedTopic`** (title + objectives from `curriculum.json`)

   to produce an **adaptive follow-up** (gate #3) when the current topic isn't yet exhausted — e.g., probing deeper into something the candidate's answer touched on, or asking a clarifying question tied to the topic's objectives.
3. **Advance the plan** to the next `PlannedTopic` once the current topic has had sufficient follow-up depth, incrementing `daysCovered` with the new topic's day.
4. **Increment `questionsAsked`** every time the agent's reply contains a new question (as opposed to, e.g., a purely closing/transition remark).
5. **Append** the agent's reply to `history` as an `agent` turn, tagged with the active topic day.

This loop guarantees:
- Gate #3 (adaptive follow-ups): every reply is generated from `(previous candidate message, current topic)`, not from a static script.
- Gate #4 (context): `history` accumulates every turn for the life of the session and is available to the reply-generation step at all times.

---

## 4. Candidate Analysis Logic (Personalization — Gate #5)

Pure function: `Candidate → CandidateSignals`, run once at session start, using only fields present in `candidate-profiles.json`.

```
CandidateSignals = {
  skippedDays: number[]           // missions[].skipped === true
  failedDays: number[]            // missions[].passed === false
  struggledDays: number[]         // passed === true, high attempts relative to candidate's own distribution
  neverAttemptedDays: number[]    // curriculum.json days absent from missions[] entirely
  strongDays: number[]            // passed === true, attempts == 1 (first-try)
  firstTryRatio: number           // signals.missionsFirstTry / signals.missionsCompleted
}
```

This is what makes the interview **personalized** (gate #5): the topic queue built in §5 is derived directly from this candidate's own mission history, attempts, skipped topics, and learning signals — not from a fixed question bank shared across all candidates. Two candidates with different `CandidateSignals` must receive different `InterviewPlan`s.

---

## 5. Interview Planning Logic (Coverage + Minimum Length — Gates #1 & #2)

Pure function: `(CandidateSignals, Curriculum) → InterviewPlan`.

**Topic selection (personalization, gate #5):**
Priority order for building the topic queue — weakest signal first:
1. `failedDays` (attempted, did not pass)
2. `skippedDays` (explicitly skipped)
3. `struggledDays` (passed, but high attempts)
4. `neverAttemptedDays` (present in curriculum, absent from candidate's missions)
5. `strongDays` (first-try passes) — included to validate genuine strength, not just probe weaknesses

Each selected day is resolved against `curriculum.json` to attach `title` and `objectives`.

**Hard gate enforcement built into the planner, not left to chance:**
- **Gate #2 (≥4 curriculum days):** the planner must select topics spanning **at least 4 distinct `day` values** before the plan is considered valid. If a candidate's `failedDays ∪ skippedDays ∪ struggledDays` union has fewer than 4 distinct days, the planner falls back to `neverAttemptedDays` and then `strongDays` (in that order) until at least 4 distinct days are represented.
- **Gate #1 (≥8 questions):** the planner assigns each `PlannedTopic` a `minQuestionsForTopic` such that the sum across all topics is **≥ 8**. With a minimum of 4 topics, this can be satisfied at 2 questions/topic minimum, but the planner should bias more questions toward `failedDays`/`skippedDays` topics.
- The Turn logic in §3 must not advance `SessionState.status` to `"complete"` — and therefore must not emit `FinalResp` — while `questionsAsked < 8` **or** `daysCovered.size < 4`, regardless of how the conversation is otherwise progressing. Both conditions are checked jointly; neither alone is sufficient to end the interview.

---

## 6. Final Feedback (Gate #6)

Once both hard gates in §5 are satisfied and the plan queue is exhausted (or another explicit stopping condition is reached), the engine produces `Feedback` matching the exact schema from `technical-specification.md`:

```
Feedback = {
  summary: string        // overall narrative of the interview
  strengths: string[]    // concise, actionable — drawn from strongDays / well-answered topics
  gaps: string[]         // concise, actionable — drawn from failedDays / skippedDays / weak answers
  next: string[]         // concise, actionable — recommended follow-up learning/actions
}
```

`strengths`, `gaps`, and `next` are populated using both `CandidateSignals` (§4) and the actual answer quality observed in `SessionState.history` — not curriculum data alone — so the feedback reflects what was actually discussed in this session, matching gate #5's personalization requirement and gate #4's context requirement.

---

## 7. UI Screens (unchanged — not a hard gate)

No UI is mandated by the supplied files or by the listed hackathon requirements, which are all API/engine-level. As before, a minimal Start → Conversation → Feedback screen set is proposed only to exercise the endpoint manually; it is not an acceptance gate.

---

## 8. Risks and Edge Cases (unchanged scope)

Carried over from the prior plan — no new requirement was given for these, so they remain open implementation risks rather than settled behavior:
- Missing/unknown `sessionId` on a Turn request.
- Duplicate Start request on an existing session.
- Empty/blank `message`.
- In-memory session state loss on restart (no persistence requirement specified).
- Malformed `Candidate` payload not matching the observed schema.
- Curriculum day referenced in a candidate's `missions[]` but absent from `curriculum.json`.
- Candidate profiles with very sparse mission history — the planner's gate-#2 fallback chain (§5) exists specifically to keep 4-day coverage achievable even for sparse profiles, but this should be verified against real sparse cases (e.g., a candidate with fewer than 4 total curriculum-day mission entries).

---

## Hackathon Acceptance Gates

Explicit, checkable conditions the implementation must satisfy before it can be considered compliant with Problem Statement 2. Each gate maps to a specific mechanism in the design above.

- [ ] **8+ questions** — `SessionState.questionsAsked >= 8` is enforced as a precondition for `done: true` (§5, §3.4). A session must not be able to reach `FinalResp` with fewer than 8 questions asked.
- [ ] **4+ curriculum days** — `SessionState.daysCovered.size >= 4` is enforced as a joint precondition alongside the question-count gate (§5). The planner's fallback chain (`failed → skipped → struggled → never-attempted → strong`) guarantees this is achievable even for sparse candidate profiles.
- [ ] **Adaptive follow-ups** — every agent reply during an active topic is generated from `(candidate's previous message, current PlannedTopic)` (§3.2), not from a static, candidate-independent question list.
- [ ] **Session context** — `SessionState.history` retains every turn (agent and candidate) for the full life of the session, keyed by `sessionId`, and is available to reply generation at every step (§1.4, §3.1).
- [ ] **Personalization** — `InterviewPlan.topics` is derived from `CandidateSignals` (§4), which in turn is derived from this candidate's own `missions[]` (skipped/failed/struggled/never-attempted/first-try) and `signals` — not a shared static script. Two different candidates must produce two different plans.
- [ ] **Final structured feedback** — the terminal response includes `feedback` with exactly `summary` (string), `strengths` (string[]), `gaps` (string[]), `next` (string[]), populated from both curriculum-derived signals and in-session answers (§6).
- [ ] **Exact `POST /api/interview` contract** — single endpoint, no auth, request/response shapes exactly as defined in `technical-specification.md` §1 (Start), §2 (Turn), §3 (End) — no additional required fields, no alternate routes (§2 of this document).
