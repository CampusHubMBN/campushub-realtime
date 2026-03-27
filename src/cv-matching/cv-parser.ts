// Utilitaire de parsing de CV
// Extrait les compétences, expériences et formations d'un texte de CV

import type { ParsedCV } from './cv-matching.types';

// Compétences par domaine — couvre tous les profils étudiants CampusHub
const TECH_SKILLS = [
  // ── Informatique & Dev ────────────────────────────────────────────────────
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
  'react', 'vue', 'angular', 'next.js', 'nextjs', 'nuxt', 'svelte', 'html', 'css', 'sass', 'tailwind',
  'node.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'nestjs',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'firebase', 'supabase',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github', 'gitlab', 'ci/cd', 'linux',
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'data science',
  'api', 'rest', 'graphql', 'microservices', 'agile', 'scrum', 'jira',

  // ── Finance & Comptabilité ────────────────────────────────────────────────
  'comptabilité', 'comptable', 'finance', 'financier', 'audit', 'auditeur',
  'contrôle de gestion', 'contrôleur de gestion', 'reporting', 'budget', 'budgétisation',
  'fiscalité', 'fiscal', 'tva', 'bilan', 'liasse fiscale', 'clôture comptable',
  'sage', 'sap', 'cegid', 'excel', 'tableaux de bord', 'kpi',
  'analyse financière', 'modélisation financière', 'trésorerie', 'cash flow',
  'ifrs', 'normes comptables', 'consolidation', 'holding',
  'banque', 'bancaire', 'crédit', 'risque', 'gestion des risques',
  'investissement', 'portefeuille', 'bourse', 'trading', 'asset management',
  'assurance', 'actuariat', 'souscription', 'sinistres',

  // ── Marketing & Communication ─────────────────────────────────────────────
  'marketing', 'marketing digital', 'digital marketing', 'e-marketing',
  'seo', 'sea', 'sem', 'référencement', 'google ads', 'google analytics', 'tag manager',
  'réseaux sociaux', 'social media', 'community management', 'community manager',
  'content marketing', 'copywriting', 'rédaction', 'création de contenu',
  'email marketing', 'newsletter', 'mailchimp', 'hubspot', 'salesforce', 'crm',
  'communication', 'relations presse', 'rp', 'attaché de presse',
  'branding', 'identité visuelle', 'notoriété', 'image de marque',
  'market research', 'étude de marché', 'analyse concurrentielle',
  "événementiel", "organisation d'événements",

  // ── Design & Création ─────────────────────────────────────────────────────
  'design', 'designer', 'ux', 'ui', 'ux/ui', 'ux design', 'ui design',
  'figma', 'sketch', 'adobe xd', 'invision', 'zeplin',
  'photoshop', 'illustrator', 'indesign', 'after effects', 'premiere pro',
  'suite adobe', 'adobe creative', 'canva', 'motion design',
  'graphisme', 'graphiste', 'maquette', 'wireframe', 'prototype',
  'design thinking', 'ergonomie', 'accessibilité',
  "architecture d'information", 'user research', 'tests utilisateurs',
  'vidéo', 'montage vidéo', 'photographie',

  // ── Management & Business ─────────────────────────────────────────────────
  'management', 'manager', 'gestion de projet', 'chef de projet', 'project manager',
  'pmp', 'prince2', 'lean', 'six sigma', 'kanban',
  'stratégie', 'business development', 'développement commercial',
  'business plan', 'analyse stratégique', 'swot', 'pestel',
  'consulting', 'conseil', 'conseil en stratégie',
  'direction', 'leadership', 'équipe', 'encadrement',
  'entrepreneuriat', 'startup', 'innovation',

  // ── Commercial & Vente ────────────────────────────────────────────────────
  'commercial', 'vente', 'vendeur', 'technico-commercial',
  'prospection', 'négociation', 'closing', 'fidélisation', 'account manager',
  'b2b', 'b2c', 'grand compte', 'kpi commercial',
  'force de vente', "portefeuille clients", "chiffre d'affaires",

  // ── Ressources Humaines ───────────────────────────────────────────────────
  'ressources humaines', 'rh', 'recrutement', 'talent acquisition',
  'paie', 'gestionnaire de paie', 'adp', 'silae', 'nibelis',
  'formation', 'plan de formation', 'gpec', 'gestion des compétences',
  'droit du travail', 'relations sociales', 'irp', 'cse',
  'onboarding', 'marque employeur', 'qvt', 'bien-être au travail',
  'sirh', 'workday', 'successfactors',

  // ── Juridique & Compliance ────────────────────────────────────────────────
  'droit', 'juridique', 'juriste', 'avocat', 'notaire',
  'droit des affaires', 'droit commercial', 'droit social', 'droit pénal',
  'droit des contrats', 'rédaction de contrats', 'contentieux',
  'propriété intellectuelle', 'rgpd', 'conformité', 'compliance',
  'due diligence', 'fusion acquisition', 'm&a',

  // ── Ingénierie & Sciences ─────────────────────────────────────────────────
  'génie civil', 'btp', 'construction', 'bâtiment', 'travaux publics',
  'génie mécanique', 'mécanique', 'cao', 'autocad', 'solidworks', 'catia',
  'génie électrique', 'électronique', 'automatisme', 'plc', 'scada',
  'génie industriel', 'production', 'lean manufacturing', 'amélioration continue',
  'qualité', 'iso', 'iso 9001', 'contrôle qualité', 'assurance qualité',
  'hse', 'sécurité', 'environnement', 'développement durable',
  'chimie', 'biologie', 'pharmacie', 'biotechnologie',
  'énergie', 'renouvelable', 'photovoltaïque', 'éolien',
  "bureau d'études", 'ingénieur études',

  // ── Logistique & Supply Chain ─────────────────────────────────────────────
  'logistique', 'supply chain', 'transport', 'achats', 'procurement',
  'approvisionnement', 'gestion des stocks', 'inventaire', 'wms', 'erp',
  'import export', 'incoterms', 'douanes', 'freight', 'fret',
  'entrepôt', 'préparation de commandes', 's&op',

  // ── Santé & Médical ───────────────────────────────────────────────────────
  'médecine', 'médecin', 'infirmier', 'infirmière', 'soins infirmiers',
  'pharmacie', 'pharmacien', 'biologie médicale',
  'santé publique', 'épidémiologie', 'prévention',
  'kinésithérapie', 'ergothérapie', 'orthophonie',
  'hôpital', 'clinique', 'ehpad', 'structure de soins',
  'dossier patient', 'logiciel médical',

  // ── Éducation & Social ────────────────────────────────────────────────────
  'enseignement', 'enseignant', 'formateur', 'pédagogie', 'ingénierie pédagogique',
  'e-learning', 'lms', 'moodle', 'formation professionnelle',
  'travail social', 'travailleur social', 'éducateur', 'aide sociale',
  'animation', 'animateur', 'bafa',

  // ── Immobilier ────────────────────────────────────────────────────────────
  'immobilier', 'agent immobilier', 'transaction', 'gestion locative',
  'promotion immobilière', 'syndic', 'expertise immobilière',

  // ── Transversal ───────────────────────────────────────────────────────────
  'pack office', 'microsoft office', 'word', 'powerpoint',
  'analyse de données', 'power bi', 'tableau', 'excel avancé',
  'gestion de la relation client', 'satisfaction client',
  'bilingue', 'trilingue', 'anglais courant', 'espagnol', 'allemand',
  'autonomie', 'rigueur', 'polyvalence', 'organisation',
];

const EXPERIENCE_KEYWORDS = ['expérience', 'experience', 'emploi', 'poste', 'travail', 'mission', 'stage', 'alternance'];
const EDUCATION_KEYWORDS = ['formation', 'education', 'diplôme', 'diplome', 'école', 'ecole', 'université', 'universite', 'master', 'licence', 'bts', 'dut', 'bac'];
const LANGUAGES = ['français', 'anglais', 'espagnol', 'allemand', 'italien', 'portugais', 'chinois', 'japonais', 'arabe', 'russe', 'coréen'];

export function parseCV(text: string): ParsedCV {
  const normalizedText = text.toLowerCase();
  const lines = text.split('\n').filter((line) => line.trim().length > 0);

  return {
    rawText: text,
    skills: extractSkills(normalizedText),
    experience: extractSection(lines, EXPERIENCE_KEYWORDS),
    education: extractSection(lines, EDUCATION_KEYWORDS),
    languages: extractLanguages(normalizedText),
  };
}

export function extractSkillsFromText(text: string): string[] {
  return extractSkills(text.toLowerCase());
}

function extractSkills(text: string): string[] {
  const foundSkills: string[] = [];
  for (const skill of TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      foundSkills.push(skill);
    }
  }
  return [...new Set(foundSkills)];
}

function extractSection(lines: string[], keywords: string[]): string[] {
  const results: string[] = [];
  let inSection = false;
  let sectionLines: string[] = [];

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (keywords.some((kw) => lowerLine.includes(kw))) {
      if (sectionLines.length > 0) results.push(sectionLines.join(' ').trim());
      inSection = true;
      sectionLines = [line];
      continue;
    }
    if (inSection) {
      if (line.trim().length < 3 || /^[A-Z]{2,}/.test(line.trim())) {
        if (sectionLines.length > 1) results.push(sectionLines.join(' ').trim());
        inSection = false;
        sectionLines = [];
      } else {
        sectionLines.push(line);
      }
    }
  }
  if (sectionLines.length > 1) results.push(sectionLines.join(' ').trim());
  return results.slice(0, 5);
}

function extractLanguages(text: string): string[] {
  return [...new Set(LANGUAGES.filter((lang) => text.includes(lang)))];
}

export function cleanPDFText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sàâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ.,;:!?@#$%&*()[\]{}\-+=/\\|<>'"]/g, ' ')
    .trim();
}
