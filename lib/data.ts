import curriculumJson from "@/data/curriculum.json";
import candidateProfilesJson from "@/data/candidate-profiles.json";
import type { Curriculum, Candidate } from "./types";

export const curriculum = curriculumJson as unknown as Curriculum;

export const allCandidates: Candidate[] = (
  candidateProfilesJson as unknown as { candidates: Candidate[] }
).candidates;

export function findCandidateById(id: string): Candidate | undefined {
  return allCandidates.find((c) => c.member.id === id);
}
