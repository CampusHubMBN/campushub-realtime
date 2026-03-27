// Moteur de matching CV/Offres d'emploi
// Utilise la similarité cosinus avec TF-IDF simplifié

import type { CVData, JobOffer, MatchResult } from './cv-matching.types';

export function calculateMatchScore(cv: CVData, job: JobOffer): MatchResult {
  const cvSkillsLower = cv.skills.map((s) => s.toLowerCase());
  const jobSkillsLower = job.requiredSkills.map((s) => s.toLowerCase());

  const matchedSkills = jobSkillsLower.filter((skill) =>
    cvSkillsLower.some((cvSkill) => cvSkill.includes(skill) || skill.includes(cvSkill)),
  );
  const missingSkills = jobSkillsLower.filter(
    (skill) => !cvSkillsLower.some((cvSkill) => cvSkill.includes(skill) || skill.includes(cvSkill)),
  );

  const skillScore = jobSkillsLower.length > 0 ? (matchedSkills.length / jobSkillsLower.length) * 60 : 30;
  const textScore = calculateTextSimilarity(cv.rawText, job.description) * 40;
  const totalScore = Math.min(100, Math.round(skillScore + textScore));

  return {
    jobOffer: job,
    score: totalScore,
    matchedSkills: matchedSkills.map((s) => job.requiredSkills.find((js) => js.toLowerCase() === s) || s),
    missingSkills: missingSkills.map((s) => job.requiredSkills.find((js) => js.toLowerCase() === s) || s),
  };
}

export function matchCVWithJobs(cv: CVData, jobs: JobOffer[]): MatchResult[] {
  return jobs.map((job) => calculateMatchScore(cv, job)).sort((a, b) => b.score - a.score);
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = tokenize(text1);
  const words2 = tokenize(text2);
  if (words1.length === 0 || words2.length === 0) return 0;
  const vocabulary = [...new Set([...words1, ...words2])];
  return cosineSimilarity(createTFVector(words1, vocabulary), createTFVector(words2, vocabulary));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüÿç]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.has(w));
}

function createTFVector(words: string[], vocabulary: string[]): number[] {
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  return vocabulary.map((w) => (counts.get(w) || 0) / words.length);
}

function cosineSimilarity(v1: number[], v2: number[]): number {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] * v1[i];
    n2 += v2[i] * v2[i];
  }
  const denom = Math.sqrt(n1) * Math.sqrt(n2);
  return denom === 0 ? 0 : dot / denom;
}

const STOP_WORDS = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'ce', 'cette', 'ces', 'mon', 'ton', 'son',
  'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
  'qui', 'que', 'quoi', 'dont', 'où', 'quand', 'comment', 'pourquoi',
  'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'chez', 'vers', 'entre',
  'être', 'avoir', 'faire', 'pouvoir', 'vouloir', 'devoir', 'aller', 'venir',
  'plus', 'moins', 'très', 'bien', 'aussi', 'encore', 'toujours', 'jamais',
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'into', 'through',
  'not', 'no', 'yes', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
]);
