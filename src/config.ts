import * as fs from 'fs';
import * as path from 'path';
import { SnaplintConfig } from './types.js';

export const DEFAULT_CONFIG: SnaplintConfig = {
  checks: [
    // Documentation
    'doc-readme', 'license', 'doc-contributing', 'doc-coc', 'doc-changelog', 'structure-gitignore',
    // Security
    'sec-env', 'sec-secrets', 'sec-npm-audit', 'sec-dependabot',
    // Quality
    'ci-config', 'quality-tests', 'quality-lint', 'quality-format', 'quality-editorconfig',
    'quality-tsconfig', 'quality-husky', 'sec-action-perms', 'quality-bundle-size',
    // Dependencies
    'dep-package', 'dep-lockfile', 'dep-outdated',
  ],
  exclude: [],
  failBelow: 50,
  format: 'text',
};

export function loadConfig(root: string): SnaplintConfig {
  const configPath = path.join(root, '.snaplintrc.json');

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return {
      checks: fileConfig.checks ?? DEFAULT_CONFIG.checks,
      exclude: fileConfig.exclude ?? [],
      failBelow: fileConfig.failBelow ?? DEFAULT_CONFIG.failBelow,
      format: fileConfig.format ?? DEFAULT_CONFIG.format,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function filterChecks(
  checks: { id: string }[],
  config: SnaplintConfig,
): { id: string }[] {
  return checks.filter(c => {
    if (config.exclude.includes(c.id)) return false;
    if (config.checks.length > 0 && !config.checks.includes(c.id)) return false;
    return true;
  });
}