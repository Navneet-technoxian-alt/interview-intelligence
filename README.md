# Interview Intelligence

## Short Description
An adaptive AI‑powered interview agent that evaluates candidates through personalized technical interviews based on their learning and missions history.

## Problem
Traditional technical interviews are static and generic. They rarely consider a candidate’s prior learning, strengths, failures, or skipped missions, resulting in assessments that miss critical context and do not surface a candidate’s true capabilities.

## Solution
This project delivers a session‑based interview experience that:
- Lets the user select a candidate profile.
- Creates a unique interview session.
- Generates personalized questions drawn from the candidate’s mission history and curriculum days.
- Adapts follow‑up questions in real time based on the candidate’s most recent answer.
- Evaluates the conversation and produces structured feedback including a summary, identified strengths, gaps, and actionable next‑step recommendations.

## Key Features
- **Candidate selection** UI.
- **Personalized interview generation** using mission‑history signals.
- **Session‑based conversation** with server‑side state.
- **Adaptive follow‑up questions** that stay on topic.
- **Mission‑history‑aware questioning** across multiple curriculum days.
- **Feedback screen** with strengths, gaps, summary, and next steps.
- **Responsive dark UI** built with Tailwind/CSS.

## Architecture
- **Next.js Frontend** – renders the UI and calls the interview API.
- **POST `/api/interview`** – the single backend route that drives the interview.
- **`conversationEngine.ts`** – manages session state, question generation, and feedback.
- **`interviewPlanner.ts`** – builds a personalized interview plan respecting hackathon acceptance gates.
- **`candidateAnalysis.ts`** – extracts signals (failed, skipped, struggled, strong, etc.) from a candidate’s mission data.
- **`sessionStore.ts`** – in‑memory store for active sessions (global singleton).
- **`data/curriculum.json`** – curriculum day definitions.
- **`data/candidate‑profiles.json`** – candidate mission data.

## Interview API Contract
### Initial request
```json
POST /api/interview
{
  "sessionId": "string",
  "candidate": { /* candidate object from candidate‑profiles.json */ }
}
```
### Follow‑up request
```json
POST /api/interview
{
  "sessionId": "string",
  "message": "string"
}
```
The server maintains the full conversation history; the client only sends the new message.

## Interview Flow
1. **Candidate Selection** – choose a profile.
2. **Session Creation** – POST with `sessionId` and candidate.
3. **Personalized First Question** – generated from the interview plan.
4. **Candidate Answer** – sent via follow‑up request.
5. **Adaptive Follow‑up** – server asks a relevant follow‑up based on the last answer.
6. **Interview Completion** – after meeting the minimum question and day gates.
7. **Feedback** – structured summary, strengths, gaps, next steps.

## Tech Stack
- **Next.js** (App Router)
- **React**
- **TypeScript**
- **Tailwind / vanilla CSS** (as configured in the repo)
- **Node.js** runtime

## Project Structure
```
.
├─ app/                 # Next.js pages & API routes
│   ├─ api/interview/   # POST /api/interview implementation
│   └─ page.tsx         # Interview UI (already customized)
├─ data/                # Curriculum and candidate JSON files
│   ├─ curriculum.json
│   └─ candidate‑profiles.json
├─ lib/                 # Core interview logic
│   ├─ conversationEngine.ts
│   ├─ interviewPlanner.ts
│   ├─ candidateAnalysis.ts
│   ├─ sessionStore.ts
│   └─ types.ts
├─ docs/                # Architecture & specifications
├─ public/              # Static assets
├─ next.config.ts
├─ package.json
└─ README.md            # ← this file
```

## Local Setup
```bash
npm install          # install dependencies
npm run dev          # start development server (http://localhost:3000)
```
For production builds and type checking:
```bash
npm run build        # generate optimized build
npx tsc --noEmit     # verify TypeScript types
```

## Current Status
- Backend API (`POST /api/interview`) is fully implemented.
- Interview frontend UI is in place.
- Adaptive conversation and follow‑up logic are functional.
- Feedback screen with strengths, gaps, and next steps works.
- `npm run build` succeeds.
- TypeScript check (`npx tsc --noEmit`) passes.

## Assumptions / Limitations
- Candidate profiles and curriculum data are loaded from the local JSON files; no external data source.
- Session state is stored in an in‑memory map (`sessionStore.ts`). It persists only while the server process runs and is not a production‑grade database.
- No authentication or multi‑user isolation is implemented.
```
