# AI Interview Agent — Requirements

**Source files used:** `technical-spec.md`, `curriculum.json`, `candidates.json` (as supplied). No requirement below is inferred beyond what these three files state. Where a requested topic is not addressed by the supplied files, this is called out explicitly rather than filled in.

---

## 1. Mandatory Requirements

Extracted directly from `technical-spec.md`:

- The agent **must** expose a single HTTP endpoint: `POST /api/interview`.
- **No authentication** is required on the endpoint.
- The endpoint **must maintain interview state** using the `sessionId` supplied by the caller.
- The **same `sessionId`** must be used throughout a given interview (per the "Notes" section).
- The interview **must remain conversational across multiple requests** (i.e., state/context persists between calls rather than each call being stateless).
- The first request's `candidate` object **must follow the schema of the supplied `candidate.json`** (see §3 and the candidate object structure documented in §12).
- The interview must eventually terminate: the response that signals completion **must** set `"done": true` and **must** include a `feedback` object (see §8).
- Non-final responses **must** set `"done": false`.
- Teams are explicitly free to choose **any** frontend, backend, LLM, framework, or architecture — this is stated as a permission, not a constraint, and is listed here for completeness.

---

## 2. Exact HTTP Endpoints

Only one endpoint is defined in the supplied technical specification:

```
POST /api/interview
```

No other endpoints, methods, or paths are specified in the supplied files.

---

## 3. Request Schemas

### 3.1 Start Interview (first request in a session)

```json
{
  "sessionId": "abc-123",
  "candidate": { ...candidate object, per candidate.json schema... }
}
```

- `sessionId` — string. Identifies the interview session.
- `candidate` — object. Must conform to the candidate structure found in `candidates.json` (see §12 for the exact fields observed in that file).

### 3.2 Conversation Turn (every subsequent request)

```json
{
  "sessionId": "abc-123",
  "message": "..."
}
```

- `sessionId` — string. Must match the session established by the Start Interview request.
- `message` — string. The candidate's latest response.

No other request shapes are defined in `technical-spec.md`.

---

## 4. Response Schemas

### 4.1 Start Interview Response

```json
{
  "reply": "Welcome. Let's begin your interview.",
  "done": false
}
```

### 4.2 Conversation Turn Response (interview still in progress)

```json
{
  "reply": "...",
  "done": false
}
```

### 4.3 End Interview Response (final turn)

```json
{
  "reply": "Interview completed.",
  "done": true,
  "feedback": {
    "summary": "...",
    "strengths": [],
    "gaps": [],
    "next": []
  }
}
```

| Field                | Type                                    |
| -------------------- | --------------------------------------- |
| `reply`              | string                                  |
| `done`               | boolean                                 |
| `feedback`           | object (present only when `done: true`) |
| `feedback.summary`   | string                                  |
| `feedback.strengths` | string[]                                |
| `feedback.gaps`      | string[]                                |
| `feedback.next`      | string[]                                |

No other response shapes are defined in `technical-spec.md`.

---

## 5. Minimum Question Count

**Not specified in the supplied files.** `technical-spec.md` does not state a minimum, maximum, or target number of questions/turns for an interview. No other supplied file (`curriculum.json`, `candidates.json`) defines a question-count requirement either. This value is left undefined by the source material and should not be assumed.

---

## 6. Curriculum-Day Coverage Requirement

**Not specified in the supplied files.** `technical-spec.md` does not reference `curriculum.json` at all, and does not state any requirement that interview questions must cover, sample, or map to curriculum days, modules, or objectives. `curriculum.json` itself (31 days across 8 modules — see §12.1) is supplied as reference/content data only; the technical specification does not impose a coverage rule over it. No coverage requirement can be derived without inventing one.

---

## 7. Follow-Up and Context Requirements

Everything the supplied files state on this topic:

- From `technical-spec.md`, "Notes": _"The interview should remain conversational across multiple requests."_
- From `technical-spec.md`, "Notes": _"Use the supplied `sessionId` throughout the interview."_
- The Conversation Turn flow ("2. Conversation Turn") states that each subsequent request carries only `sessionId` and `message` — implying the agent, not the caller, is responsible for retaining prior conversation state/context, since the request does not resend history.
- The "Interview Flow" section states this exchange "continues until the interview is complete," describing the interview as an ongoing back-and-forth rather than single-shot Q&A.

No explicit rules on follow-up-question logic, number of follow-ups, adaptivity, or what context must be carried forward are given beyond the above. Any such behavior is left to the implementing team, per the "Notes" statement that teams are free to choose their own architecture.

---

## 8. Final Feedback Requirements

From `technical-spec.md`, "Feedback Format":

- The final response (where `done: true`) **must** include a `feedback` object.
- `feedback.summary` — string.
- `feedback.strengths` — string[].
- `feedback.gaps` — string[].
- `feedback.next` — string[].
- **"Each array should contain concise, actionable points."** (stated requirement on array content quality.)

No further requirements (e.g., minimum/maximum number of points per array, required tone, or scoring rubric) are specified in the supplied files.

---

## 9. Edge Cases

**Not specified in the supplied files.** `technical-spec.md` does not describe error handling, invalid/missing `sessionId`, malformed requests, empty `message`, reconnecting to an expired or unknown session, duplicate Start Interview calls, or any other edge-case behavior. No edge-case handling can be documented here without inventing it; implementers should treat this as an open item.

---

## 10. Acceptance Checklist

Checklist items below are limited to what is explicitly required in §1–§4 and §8; unspecified items (§5, §6, §7 beyond what's quoted, §9) are intentionally excluded rather than assumed.

- [ ] Exposes `POST /api/interview` and no other endpoint is required to fulfill the spec.
- [ ] Endpoint requires no authentication.
- [ ] Accepts a Start Interview request of the shape `{ sessionId, candidate }`.
- [ ] `candidate` payload is accepted per the structure found in `candidate.json`/`candidates.json`.
- [ ] Accepts Conversation Turn requests of the shape `{ sessionId, message }`.
- [ ] State is maintained server-side and keyed by `sessionId` across multiple requests.
- [ ] The same `sessionId` is honored/used for the duration of a single interview.
- [ ] Non-final responses return `{ reply, done: false }`.
- [ ] The interview continues across multiple request/response turns (conversational, not single-shot).
- [ ] The final response returns `{ reply, done: true, feedback }`.
- [ ] `feedback` includes `summary` (string), `strengths` (string[]), `gaps` (string[]), `next` (string[]).
- [ ] Entries in `strengths`, `gaps`, and `next` are concise and actionable (per spec wording).

---

## 11. Explicitly Out of Scope / Unconstrained by the Spec

Per `technical-spec.md`, "Notes": _"Teams are free to choose any frontend, backend, LLM, framework, or architecture."_ This means implementation technology is not a requirement to document or check against.

---

## 12. Supplied Data Structures (for reference)

These are documented as observed in the supplied data files. They are not, by themselves, additional behavioral requirements beyond what §1–§9 already state — `technical-spec.md` only requires that the `candidate` request field follow the `candidate.json` shape.

### 12.1 `curriculum.json`

- Top-level: `cohort` (string), `modules` (array), `days` (array).
- `modules[]`: `n` (number), `title` (string), `days` (array of two numbers — start/end day range).
- `days[]`: `day` (number), `title` (string), `type` (string, e.g. `SETUP`, `BUILD`, `AI_CORE`, `LEARN`, `SHIP_IT`, `OPTIMIZE`, `CAPSTONE`), `tools` (string[]), `objectives` (string[]).
- The file describes a 31-day, 8-module curriculum (per its `cohort` field: "AI Cohort · 31 days · 8 modules").

### 12.2 `candidates.json`

- Top-level: `candidates` (array).
- Each candidate entry contains:
  - `member`: `id`, `name`, `jobRole`, `yearsExperience`, `education`, `status` (string fields; `yearsExperience` is numeric).
  - `missions`: array of entries, each with `day` (number), `title` (string), and either (`passed`: boolean, `attempts`: number) or (`skipped`: true).
  - `signals`: `commitDays` (number), `missionsCompleted` (number), `missionsFirstTry` (number).

`technical-spec.md` states the `candidate` field of the Start Interview request "will follow the provided `candidate.json` schema" — the structure above (specifically the `member` object, or the full candidate entry, depending on how `candidate.json` itself is scoped) is the schema referenced. The supplied files include `candidates.json` (a collection of 20 such candidate entries) rather than a single `candidate.json`; no separate single-candidate schema file was supplied.
