import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkPackageJson(project: ProjectInfo): CheckResult {
  const maxPoints = 10;
  const pkgPath = path.join(project.root, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return skip('dep-package', 'package.json', 'Not a Node.js project', maxPoints);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const issues: string[] = [];
  let points = maxPoints;

  // Check for outdated deps
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const depCount = Object.keys(deps).length;

  if (depCount === 0) {
    return {
      id: 'dep-package',
      name: 'package.json health',
      category: 'dependencies',
      status: 'pass',
      severity: 'info',
      message: 'No dependencies',
      points: maxPoints,
      maxPoints,
    };
  }

  // Check for pinned versions vs ranges
  const pinnedCount = Object.entries(deps).filter(([, v]) => /^\d/.test(v as string)).length;
  const rangeCount = depCount - pinnedCount;

  if (rangeCount > depCount * 0.8) {
    issues.push(`${rangeCount}/${depCount} deps use ranges (consider pinning)`);
    points -= 2;
  }

  // Check for common problematic deps
  const problematic = ['left-pad', 'core-js@2', 'lodash@4.17.4', 'minimist@0.0.8'];
  for (const p of problematic) {
    const [name, ver] = p.split('@');
    if (deps[name] && (!ver || deps[name].includes(ver))) {
      issues.push(`Problematic dependency: ${p}`);
      points -= 3;
    }
  }

  // Check scripts
  if (!pkg.scripts || Object.keys(pkg.scripts).length < 2) {
    issues.push('Few npm scripts defined');
    points -= 1;
  }

  // Check for engines field
  if (!pkg.engines) {
    issues.push('No engines field (Node version requirement)');
    points -= 1;
  }

  // Check for type field
  if (!pkg.type && !pkg.module && !pkg.exports) {
    issues.push('No module type defined');
    points -= 1;
  }

  if (issues.length > 0) {
    return {
      id: 'dep-package',
      name: 'package.json health',
      category: 'dependencies',
      status: points < 5 ? 'fail' : 'warn',
      severity: points < 5 ? 'medium' : 'low',
      message: `${issues.length} issue(s)`,
      detail: issues.join('; '),
      fix: 'Review package.json: pin versions, add scripts, set engines.',
      points: Math.max(0, points),
      maxPoints,
    };
  }

  return {
    id: 'dep-package',
    name: 'package.json health',
    category: 'dependencies',
    status: 'pass',
    severity: 'info',
    message: 'package.json looks healthy',
    points: maxPoints,
    maxPoints,
  };
}

export function checkLockfile(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const root = project.root;

  const lockfiles = {
    'npm': 'package-lock.json',
    'pnpm': 'pnpm-lock.yaml',
    'yarn': 'yarn.lock',
    'bun': 'bun.lockb',
  };

  let foundLock: string | null = null;
  for (const [pm, file] of Object.entries(lockfiles)) {
    if (fs.existsSync(path.join(root, file))) {
      foundLock = pm;
      break;
    }
  }

  if (project.language !== 'typescript' && project.language !== 'javascript') {
    return skip('dep-lockfile', 'Lockfile', 'Not a Node.js project', maxPoints);
  }

  if (!foundLock) {
    return {
      id: 'dep-lockfile',
      name: 'Lockfile',
      category: 'dependencies',
      status: 'fail',
      severity: 'high',
      message: 'No lockfile found',
      detail: 'Without a lockfile, dependency versions are not reproducible.',
      fix: 'Run npm install / pnpm install / yarn to generate a lockfile.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'dep-lockfile',
    name: 'Lockfile',
    category: 'dependencies',
    status: 'pass',
    severity: 'info',
    message: `Lockfile: ${foundLock}`,
    points: maxPoints,
    maxPoints,
  };
}

export function checkOutdatedDeps(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const root = project.root;

  if (!fs.existsSync(path.join(root, 'package.json'))) {
    return skip('dep-outdated', 'Outdated deps', 'Not a Node.js project', maxPoints);
  }

  try {
    const output = execSync('npm outdated --json 2>&1 || true', { cwd: root, timeout: 30000, encoding: 'utf-8' });
    const outdated = JSON.parse(output || '{}');
    const count = Object.keys(outdated).length;

    if (count === 0) {
      return {
        id: 'dep-outdated',
        name: 'Outdated dependencies',
        category: 'dependencies',
        status: 'pass',
        severity: 'info',
        message: 'All dependencies up to date',
        points: maxPoints,
        maxPoints,
      };
    }

    const major = Object.entries(outdated).filter(([, v]: [string, any]) => {
      if (!v.current || !v.latest) return false;
      const curMajor = parseInt(v.current.replace(/[^\d]/g, '').substring(0, 1));
      const latMajor = parseInt(v.latest.replace(/[^\d]/g, '').substring(0, 1));
      return latMajor > curMajor;
    }).length;

    let points = maxPoints;
    if (major > 5) points = 1;
    else if (major > 2) points = 2;
    else if (count > 10) points = 3;

    return {
      id: 'dep-outdated',
      name: 'Outdated dependencies',
      category: 'dependencies',
      status: points < 3 ? 'fail' : 'warn',
      severity: major > 2 ? 'high' : 'medium',
      message: `${count} outdated (${major} major)`,
      fix: 'Run `npm update` or `npm outdated` to review and update.',
      points,
      maxPoints,
    };
  } catch {
    return {
      id: 'dep-outdated',
      name: 'Outdated dependencies',
      category: 'dependencies',
      status: 'warn',
      severity: 'low',
      message: 'Could not check outdated deps',
      points: 3,
      maxPoints,
    };
  }
}

function skip(id: string, name: string, message: string, maxPoints: number): CheckResult {
  return {
    id,
    name,
    category: 'dependencies',
    status: 'skip',
    severity: 'info',
    message,
    points: maxPoints,
    maxPoints,
  };
}