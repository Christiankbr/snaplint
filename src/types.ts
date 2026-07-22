export interface CheckResult {
  id: string;
  name: string;
  category: CheckCategory;
  status: CheckStatus;
  severity: Severity;
  message: string;
  detail?: string;
  fix?: string;
  points: number;
  maxPoints: number;
}

export type CheckCategory =
  | 'documentation'
  | 'security'
  | 'quality'
  | 'ci'
  | 'structure'
  | 'dependencies'
  | 'license';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';

export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface ProjectInfo {
  root: string;
  name: string;
  language: DetectedLanguage;
  packageManager: string | null;
  hasGit: boolean;
  fileCount: number;
}

export type DetectedLanguage =
  | 'typescript'
  | 'javascript'
  | 'rust'
  | 'python'
  | 'go'
  | 'java'
  | 'unknown';

export interface ScoreResult {
  total: number;
  max: number;
  percentage: number;
  grade: Grade;
  byCategory: Record<string, { score: number; max: number }>;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface SnaplintConfig {
  checks: string[];
  exclude: string[];
  failBelow: number;
  format: 'text' | 'json' | 'markdown';
}