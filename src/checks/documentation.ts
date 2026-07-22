import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkReadme(project: ProjectInfo): CheckResult {
  const readmePath = findFile(project.root, ['README.md', 'README.rst', 'README.txt', 'readme.md']);
  const maxPoints = 10;

  if (!readmePath) {
    return {
      id: 'doc-readme',
      name: 'README exists',
      category: 'documentation',
      status: 'fail',
      severity: 'high',
      message: 'No README found',
      detail: 'Every project needs a README. It is the first thing people see.',
      fix: 'Create a README.md with project name, description, install instructions, and usage.',
      points: 0,
      maxPoints,
    };
  }

  const content = fs.readFileSync(readmePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0).length;

  if (lines < 10) {
    return {
      id: 'doc-readme',
      name: 'README quality',
      category: 'documentation',
      status: 'warn',
      severity: 'medium',
      message: `README is thin (${lines} lines)`,
      detail: 'A good README has: title, description, install, usage, license, contributing.',
      fix: 'Add install instructions, usage examples, and license info to your README.',
      points: 5,
      maxPoints,
    };
  }

  const hasBadges = /!\[.*\]\(https:\/\//.test(content) || /badge/.test(content);
  const hasInstall = /install|installat|setup|getting started/i.test(content);
  const hasUsage = /usage|example|how to use/i.test(content);
  const hasLicense = /license|licence|mit|apache|gpl/i.test(content);

  let points = 10;
  const missing: string[] = [];

  if (!hasInstall) { points -= 2; missing.push('install instructions'); }
  if (!hasUsage) { points -= 2; missing.push('usage examples'); }
  if (!hasLicense) { points -= 2; missing.push('license info'); }
  if (!hasBadges) { points -= 1; missing.push('badges'); }

  if (missing.length > 0) {
    return {
      id: 'doc-readme',
      name: 'README quality',
      category: 'documentation',
      status: 'warn',
      severity: 'low',
      message: `README could be improved`,
      detail: `Missing: ${missing.join(', ')}`,
      fix: `Add: ${missing.join(', ')} to your README.`,
      points,
      maxPoints,
    };
  }

  return {
    id: 'doc-readme',
    name: 'README quality',
    category: 'documentation',
    status: 'pass',
    severity: 'info',
    message: 'README is comprehensive',
    points,
    maxPoints,
  };
}

export function checkLicense(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const licensePath = findFile(project.root, ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']);

  if (!licensePath) {
    return {
      id: 'license',
      name: 'License file',
      category: 'license',
      status: 'fail',
      severity: 'high',
      message: 'No LICENSE file found',
      detail: 'Without a license, your code is technically all-rights-reserved. Nobody can legally use it.',
      fix: 'Add a LICENSE file. MIT or Apache-2.0 are good defaults.',
      points: 0,
      maxPoints,
    };
  }

  const content = fs.readFileSync(licensePath, 'utf-8');
  let licenseType = 'unknown';

  if (/MIT License/.test(content)) licenseType = 'MIT';
  else if (/Apache License/.test(content)) licenseType = 'Apache-2.0';
  else if (/GNU GENERAL PUBLIC LICENSE/.test(content)) licenseType = 'GPL';
  else if (/BSD/.test(content)) licenseType = 'BSD';
  else if (/ISC License/.test(content)) licenseType = 'ISC';

  return {
    id: 'license',
    name: 'License file',
    category: 'license',
    status: 'pass',
    severity: 'info',
    message: `License: ${licenseType}`,
    points: maxPoints,
    maxPoints,
  };
}

export function checkGitignore(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const gitignorePath = path.join(project.root, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return {
      id: 'structure-gitignore',
      name: '.gitignore',
      category: 'structure',
      status: 'fail',
      severity: 'medium',
      message: 'No .gitignore found',
      detail: 'You are probably committing build artifacts or dependencies.',
      fix: 'Add a .gitignore file. Use github.com/github/gitignore templates.',
      points: 0,
      maxPoints,
    };
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const lang = project.language;
  const missing: string[] = [];

  if (lang === 'typescript' || lang === 'javascript') {
    if (!/node_modules/.test(content)) missing.push('node_modules');
    if (!/dist/.test(content)) missing.push('dist');
    if (!/\.env/.test(content)) missing.push('.env');
  } else if (lang === 'rust') {
    if (!/target/.test(content)) missing.push('target');
  } else if (lang === 'python') {
    if (!/__pycache__/.test(content)) missing.push('__pycache__');
    if (!/\.pyc/.test(content)) missing.push('*.pyc');
    if (!/\.venv|venv/.test(content)) missing.push('venv');
  } else if (lang === 'go') {
    if (!/vendor/.test(content)) missing.push('vendor (optional)');
  }

  if (missing.length > 0) {
    return {
      id: 'structure-gitignore',
      name: '.gitignore completeness',
      category: 'structure',
      status: 'warn',
      severity: 'low',
      message: `.gitignore missing: ${missing.join(', ')}`,
      fix: `Add these entries to .gitignore: ${missing.join(', ')}`,
      points: 3,
      maxPoints,
    };
  }

  return {
    id: 'structure-gitignore',
    name: '.gitignore',
    category: 'structure',
    status: 'pass',
    severity: 'info',
    message: '.gitignore looks good',
    points: maxPoints,
    maxPoints,
  };
}

export function checkContributing(project: ProjectInfo): CheckResult {
  const maxPoints = 3;
  const contributingPath = findFile(project.root, ['CONTRIBUTING.md', 'CONTRIBUTE.md']);

  if (!contributingPath) {
    return {
      id: 'doc-contributing',
      name: 'CONTRIBUTING.md',
      category: 'documentation',
      status: 'warn',
      severity: 'low',
      message: 'No CONTRIBUTING.md',
      detail: 'Helps others contribute. Important for open source projects.',
      fix: 'Add a CONTRIBUTING.md with guidelines for PRs, code style, and setup.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'doc-contributing',
    name: 'CONTRIBUTING.md',
    category: 'documentation',
    status: 'pass',
    severity: 'info',
    message: 'CONTRIBUTING.md exists',
    points: maxPoints,
    maxPoints,
  };
}

export function checkCodeOfConduct(project: ProjectInfo): CheckResult {
  const maxPoints = 2;
  const cocPath = findFile(project.root, ['CODE_OF_CONDUCT.md']);

  if (!cocPath) {
    return {
      id: 'doc-coc',
      name: 'Code of Conduct',
      category: 'documentation',
      status: 'warn',
      severity: 'low',
      message: 'No CODE_OF_CONDUCT.md',
      fix: 'Add a CODE_OF_CONDUCT.md. Use the Contributor Covenant template.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'doc-coc',
    name: 'Code of Conduct',
    category: 'documentation',
    status: 'pass',
    severity: 'info',
    message: 'CODE_OF_CONDUCT.md exists',
    points: maxPoints,
    maxPoints,
  };
}

export function checkChangelog(project: ProjectInfo): CheckResult {
  const maxPoints = 3;
  const changelogPath = findFile(project.root, ['CHANGELOG.md', 'CHANGES.md', 'HISTORY.md']);

  if (!changelogPath) {
    return {
      id: 'doc-changelog',
      name: 'CHANGELOG.md',
      category: 'documentation',
      status: 'warn',
      severity: 'low',
      message: 'No CHANGELOG.md',
      fix: 'Add a CHANGELOG.md following keepachangelog.com format.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'doc-changelog',
    name: 'CHANGELOG.md',
    category: 'documentation',
    status: 'pass',
    severity: 'info',
    message: 'CHANGELOG.md exists',
    points: maxPoints,
    maxPoints,
  };
}

function findFile(root: string, names: string[]): string | null {
  for (const name of names) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}