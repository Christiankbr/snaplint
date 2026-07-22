import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkActionSecurity(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const workflowsDir = path.join(project.root, '.github', 'workflows');

  if (!fs.existsSync(workflowsDir)) {
    return {
      id: 'sec-action-perms',
      name: 'GitHub Actions security',
      category: 'security',
      status: 'skip',
      severity: 'info',
      message: 'No GitHub Actions workflows found',
      points: maxPoints,
      maxPoints,
    };
  }

  const issues: string[] = [];
  let workflowCount = 0;

  try {
    const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    for (const file of files) {
      workflowCount++;
      const filePath = path.join(workflowsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for permissions field
      if (!/permissions\s*:/.test(content)) {
        issues.push(`${file}: no permissions set (defaults to write-all)`);
      }

      // Check for pull_request_target trigger (dangerous)
      if (/pull_request_target/.test(content)) {
        issues.push(`${file}: uses pull_request_target (dangerous, can execute forked code)`);
      }

      // Check for untrusted actions (using @master or @main refs)
      if (/uses:\s*\S+@\s*(master|main)\s/g.test(content)) {
        issues.push(`${file}: uses action pinned to main/master (should pin to SHA)`);
      }

      // Check if secrets are passed to pull_request_target
      if (/pull_request_target/.test(content) && /secrets\./.test(content)) {
        issues.push(`${file}: secrets exposed in pull_request_target workflow`);
      }

      // Check for explicit read permissions
      if (/permissions\s*:/.test(content) && !/contents:\s*read/.test(content) && !/read-all/.test(content)) {
        // Has permissions but not locked to read
        if (!/contents:\s*write|packages:\s*write|id-token:\s*write/.test(content)) {
          // not explicitly write, might be fine
        }
      }
    }
  } catch { /* */ }

  if (workflowCount === 0) {
    return {
      id: 'sec-action-perms',
      name: 'GitHub Actions security',
      category: 'security',
      status: 'skip',
      severity: 'info',
      message: 'No workflow files found',
      points: maxPoints,
      maxPoints,
    };
  }

  if (issues.length === 0) {
    return {
      id: 'sec-action-perms',
      name: 'GitHub Actions security',
      category: 'security',
      status: 'pass',
      severity: 'info',
      message: `${workflowCount} workflow(s) look secure`,
      points: maxPoints,
      maxPoints,
    };
  }

  let points = maxPoints;
  for (const issue of issues) {
    if (issue.includes('pull_request_target')) points -= 2;
    else if (issue.includes('no permissions')) points -= 1;
    else points -= 1;
  }

  return {
    id: 'sec-action-perms',
    name: 'GitHub Actions security',
    category: 'security',
    status: points < 2 ? 'fail' : 'warn',
    severity: points < 2 ? 'high' : 'medium',
    message: `${issues.length} security issue(s) in workflows`,
    detail: issues.join('\n'),
    fix: 'Add `permissions: contents: read` to workflows. Avoid pull_request_target with secrets.',
    points: Math.max(0, points),
    maxPoints,
  };
}