import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkHuskyHooks(project: ProjectInfo): CheckResult {
  const maxPoints = 3;
  const root = project.root;

  // Check for husky via .husky directory or package.json config
  const huskyDir = path.join(root, '.husky');
  const pkgPath = path.join(root, 'package.json');

  let hasHuskyDir = false;
  let hasHuskyConfig = false;
  const hooks: string[] = [];

  if (fs.existsSync(huskyDir)) {
    hasHuskyDir = true;
    try {
      const entries = fs.readdirSync(huskyDir);
      for (const entry of entries) {
        if (entry === '_' || entry.startsWith('.')) continue;
        const hookPath = path.join(huskyDir, entry);
        if (fs.existsSync(hookPath) && fs.statSync(hookPath).isFile()) {
          hooks.push(entry);
        }
      }
    } catch { /* */ }
  }

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.husky || (pkg.devDependencies && pkg.devDependencies.husky)) {
        hasHuskyConfig = true;
      }
      if (pkg.husky?.hooks) {
        hooks.push(...Object.keys(pkg.husky.hooks));
      }
    } catch { /* */ }
  }

  // Also check for simple-git-hooks or lefthook
  const hasSimpleGitHooks = fs.existsSync(path.join(root, 'simple-git-hooks')) ||
    (fs.existsSync(pkgPath) && fs.readFileSync(pkgPath, 'utf-8').includes('simple-git-hooks'));
  const hasLefthook = fs.existsSync(path.join(root, 'lefthook.yml')) || fs.existsSync(path.join(root, 'lefthook.yaml'));

  if (!hasHuskyDir && !hasHuskyConfig && !hasSimpleGitHooks && !hasLefthook) {
    return {
      id: 'quality-husky',
      name: 'Git hooks',
      category: 'quality',
      status: 'warn',
      severity: 'low',
      message: 'No git hooks configured (husky, simple-git-hooks, lefthook)',
      fix: 'Install husky and add a pre-commit hook for linting/formatting.',
      points: 0,
      maxPoints,
    };
  }

  if (hooks.length === 0) {
    return {
      id: 'quality-husky',
      name: 'Git hooks',
      category: 'quality',
      status: 'warn',
      severity: 'low',
      message: 'Git hooks tool installed but no hooks found',
      fix: 'Add a pre-commit hook (e.g., npx husky add .husky/pre-commit "npm test").',
      points: 1,
      maxPoints,
    };
  }

  const hasPreCommit = hooks.includes('pre-commit') || hooks.some(h => h.includes('pre-commit'));
  if (!hasPreCommit) {
    return {
      id: 'quality-husky',
      name: 'Git hooks',
      category: 'quality',
      status: 'warn',
      severity: 'low',
      message: `Hooks: ${hooks.join(', ')} (no pre-commit)`,
      fix: 'Add a pre-commit hook for linting or testing.',
      points: 2,
      maxPoints,
    };
  }

  return {
    id: 'quality-husky',
    name: 'Git hooks',
    category: 'quality',
    status: 'pass',
    severity: 'info',
    message: `Git hooks: ${hooks.join(', ')}`,
    points: maxPoints,
    maxPoints,
  };
}