import { Injectable, Logger, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseCV, extractSkillsFromText, cleanPDFText } from './cv-parser';
import { matchCVWithJobs } from './matching-engine';
import type { CVData, JobOffer, MatchResult, ParsedCV } from './cv-matching.types';


const CONTRACT_TYPE_MAP: Record<string, JobOffer['contractType']> = {
  internship:    'Stage',
  apprenticeship: 'Alternance',
  cdd:           'CDD',
  cdi:           'CDI',
  freelance:     'Freelance',
};

@Injectable()
export class CvMatchingService {
  private readonly logger = new Logger(CvMatchingService.name);

  constructor(private readonly config: ConfigService) {}

  // ── Parse PDF buffer → raw text ────────────────────────────────────────────
  async parsePdf(buffer: Buffer, fileName: string): Promise<{ rawText: string; pageCount: number; fileName: string }> {
    // Import the internal lib directly — pdf-parse/index.js reads a test file on load
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    const rawText: string = data.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Le PDF ne contient pas de texte extractible');
    }

    return { rawText, pageCount: data.numpages as number, fileName };
  }

  // ── Analyse rule-based du texte brut → ParsedCV ────────────────────────────
  analyzeText(rawText: string): ParsedCV {
    return parseCV(cleanPDFText(rawText));
  }

  // ── Matching TF-IDF contre les offres CampusHub ────────────────────────────
  async matchCV(cv: Partial<CVData>): Promise<MatchResult[]> {
    const jobs = await this.fetchCampusHubJobs();
    if (jobs.length === 0) return [];

    const cvData: CVData = {
      id:         'temp-' + Date.now(),
      fileName:   'uploaded-cv.pdf',
      rawText:    cv.rawText    || '',
      skills:     cv.skills     || [],
      experience: cv.experience || [],
      education:  cv.education  || [],
      languages:  cv.languages  || [],
      createdAt:  new Date(),
    };

    return matchCVWithJobs(cvData, jobs);
  }

  // ── Fetch jobs from Laravel backend ───────────────────────────────────────
  private async fetchCampusHubJobs(): Promise<JobOffer[]> {
    const backendUrl = this.config.get<string>('backendUrl') || 'http://localhost:8000';

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/api/jobs?per_page=100`, {
        headers: { Accept: 'application/json' },
      });
    } catch {
      this.logger.error('Cannot reach CampusHub backend');
      throw new ServiceUnavailableException('Impossible de récupérer les offres. Le backend est-il démarré ?');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`Jobs API error: ${response.status}`);
    }

    const json = await response.json() as { data?: any[] };
    const jobs: any[] = json.data ?? [];

    const published = jobs.filter((job) => job.status === 'published' && job.is_active);

    if (published.length === 0) {
      return [];
    }

    return published.map((job): JobOffer => {
      const fullText = [job.description, job.requirements].filter(Boolean).join(' ');
      return {
        id:             String(job.id),
        title:          job.title,
        company:        job.company?.name ?? job.company_name ?? 'Entreprise',
        description:    fullText,
        requiredSkills: extractSkillsFromText(fullText),
        location:       job.location_city ?? job.location_country ?? '',
        salary:         job.salary_min
          ? `${job.salary_min}–${job.salary_max ?? '?'} ${job.salary_currency}/${job.salary_period}`
          : undefined,
        contractType:   CONTRACT_TYPE_MAP[job.type] ?? 'CDI',
        source:         job.source_type ?? 'internal',
        externalUrl:    job.external_url ?? undefined,
        createdAt:      new Date(job.created_at),
      };
    });
  }
}
