// Types pour le module de matching CV

export interface CVData {
  id: string;
  userId?: string;
  fileName: string;
  rawText: string;
  skills: string[];
  experience: string[];
  education: string[];
  languages: string[];
  createdAt: Date;
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  location: string;
  salary?: string;
  contractType: 'CDI' | 'CDD' | 'Stage' | 'Alternance' | 'Freelance';
  source: 'internal' | 'external';
  externalUrl?: string;
  createdAt: Date;
}

export interface MatchResult {
  jobOffer: JobOffer;
  score: number; // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  explanation?: string;
  recommendation?: string;
}

export interface ParsedCV {
  rawText: string;
  skills: string[];
  experience: string[];
  education: string[];
  languages: string[];
  profile_summary?: string;
  domain?: string;
  seniority?: 'étudiant' | 'junior' | 'confirmé' | 'senior';
}
