import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkEnvFiles(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const root = project.root;

  // Check for .env files that are committed
  const envFiles = findEnvFiles(root);
  const gitignorePath = path.join(root, '.gitignore');
  const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

  const exposedEnv: string[] = [];
  for (const f of envFiles) {
    const basename = path.basename(f);
    if (!gitignore.includes(basename) && !gitignore.includes('.env')) {
      exposedEnv.push(basename);
    }
  }

  if (exposedEnv.length > 0) {
    return {
      id: 'sec-env',
      name: 'Environment files exposed',
      category: 'security',
      status: 'fail',
      severity: 'critical',
      message: `${exposedEnv.length} .env file(s) not in .gitignore`,
      detail: `Exposed: ${exposedEnv.join(', ')}`,
      fix: `Add ${exposedEnv.join(', ')} to .gitignore immediately. Check git history for leaked secrets.`,
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'sec-env',
    name: 'Environment files',
    category: 'security',
    status: 'pass',
    severity: 'info',
    message: 'No exposed .env files',
    points: maxPoints,
    maxPoints,
  };
}

export function checkSecrets(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const root = project.root;

  const secretPatterns = [
    { pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"][a-zA-Z0-9]{20,}['"]/gi, name: 'API key' },
    { pattern: /(?:secret|secret[_-]?key)\s*[=:]\s*['"][a-zA-Z0-9]{20,}['"]/gi, name: 'Secret key' },
    { pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"][^'"]{8,}['"]/gi, name: 'Password' },
    { pattern: /(?:token|auth[_-]?token)\s*[=:]\s*['"][a-zA-Z0-9]{20,}['"]/gi, name: 'Token' },
    { pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, name: 'Private key' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub PAT' },
    { pattern: /sk-[a-zA-Z0-9]{48}/g, name: 'OpenAI API key' },
    { pattern: /AKIA[A-Z0-9]{16}/g, name: 'AWS access key' },
  ];

  const skipDirs = ['node_modules', '.git', 'dist', 'target', '__pycache__', 'vendor', '.cache', 'build'];
  const skipExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.lock'];
  const findings: string[] = [];

  function scan(dir: string, depth: number) {
    if (depth > 8 || findings.length >= 5) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (findings.length >= 5) break;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!skipDirs.includes(entry.name)) scan(fullPath, depth + 1);
        } else {
          const ext = path.extname(entry.name);
          if (skipExts.includes(ext)) continue;
          if (entry.name === '.env' || entry.name === '.env.example' || entry.name === '.env.sample') continue;
          if (entry.name === 'package-lock.json' || entry.name === 'yarn.lock') continue;

          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            for (const { pattern, name } of secretPatterns) {
              if (pattern.test(content)) {
                findings.push(`${name} in ${path.relative(project.root, fullPath)}`);
                break;
              }
            }
          } catch { /* binary or too large */ }
        }
      }
    } catch { /* permission */ }
  }

  scan(root, 0);

  if (findings.length > 0) {
    return {
      id: 'sec-secrets',
      name: 'Hardcoded secrets',
      category: 'security',
      status: 'fail',
      severity: 'critical',
      message: `${findings.length} potential secret(s) found`,
      detail: findings.join('\n'),
      fix: 'Move secrets to environment variables. Rotate any leaked keys immediately.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'sec-secrets',
    name: 'Secret scanning',
    category: 'security',
    status: 'pass',
    severity: 'info',
    message: 'No hardcoded secrets detected',
    points: maxPoints,
    maxPoints,
  };
}

export function checkNpmAudit(project: ProjectInfo): CheckResult {
  const maxPoints = 10;

  if (!fs.existsSync(path.join(project.root, 'package.json'))) {
    return skip('sec-npm-audit', 'npm audit', 'Not a Node.js project', maxPoints);
  }

  try {
    const output = execSync('npm audit --json 2>&1', { cwd: project.root, timeout: 30000, encoding: 'utf-8' });
    const audit = JSON.parse(output);
    const vulns = audit.metadata?.vulnerabilities || {};

    const total = (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0) + (vulns.low || 0);

    if (total === 0) {
      return {
        id: 'sec-npm-audit',
        name: 'npm audit',
        category: 'security',
        status: 'pass',
        severity: 'info',
        message: 'No vulnerabilities found',
        points: maxPoints,
        maxPoints,
      };
    }

    const critical = vulns.critical || 0;
    const high = vulns.high || 0;
    const moderate = vulns.moderate || 0;
    const low = vulns.low || 0;

    let points = maxPoints;
    if (critical > 0) points = 0;
    else if (high > 0) points = 2;
    else if (moderate > 0) points = 5;
    else if (low > 0) points = 8;

    return {
      id: 'sec-npm-audit',
      name: 'npm audit',
      category: 'security',
      status: critical > 0 || high > 0 ? 'fail' : 'warn',
      severity: critical > 0 ? 'critical' : high > 0 ? 'high' : 'medium',
      message: `${total} vulnerabilities (${critical} critical, ${high} high, ${moderate} moderate, ${low} low)`,
      fix: 'Run `npm audit fix` to resolve vulnerabilities.',
      points,
      maxPoints,
    };
  } catch {
    return {
      id: 'sec-npm-audit',
      name: 'npm audit',
      category: 'security',
      status: 'warn',
      severity: 'low',
      message: 'Could not run npm audit',
      points: 5,
      maxPoints,
    };
  }
}

export function checkDependabot(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const dependabotPath = path.join(project.root, '.github', 'dependabot.yml');
  const dependabotPath2 = path.join(project.root, '.github', 'dependabot.yaml');

  if (!fs.existsSync(dependabotPath) && !fs.existsSync(dependabotPath2)) {
    return {
      id: 'sec-dependabot',
      name: 'Dependabot',
      category: 'security',
      status: 'warn',
      severity: 'medium',
      message: 'Dependabot not configured',
      detail: 'Dependabot automatically creates PRs to update your dependencies.',
      fix: 'Add .github/dependabot.yml to enable automated dependency updates.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'sec-dependabot',
    name: 'Dependabot',
    category: 'security',
    status: 'pass',
    severity: 'info',
    message: 'Dependabot configured',
    points: maxPoints,
    maxPoints,
  };
}

function findEnvFiles(root: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && /^\.env(\.|$)/.test(entry.name)) {
        results.push(path.join(root, entry.name));
      }
    }
  } catch { /* */ }
  return results;
}

function skip(id: string, name: string, message: string, maxPoints: number): CheckResult {
  return {
    id,
    name,
    category: 'security',
    status: 'skip',
    severity: 'info',
    message,
    points: maxPoints,
    maxPoints,
  };
}