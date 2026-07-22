import { CheckResult, ScoreResult, Grade } from './types.js';

export function calculateScore(results: CheckResult[]): ScoreResult {
  const byCategory: Record<string, { score: number; max: number }> = {};
  let total = 0;
  let max = 0;

  for (const r of results) {
    if (r.status === 'skip') continue;

    const cat = r.category;
    if (!byCategory[cat]) {
      byCategory[cat] = { score: 0, max: 0 };
    }
    byCategory[cat].score += r.points;
    byCategory[cat].max += r.maxPoints;
    total += r.points;
    max += r.maxPoints;
  }

  const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
  const grade = percentageToGrade(percentage);

  return { total, max, percentage, grade, byCategory };
}

function percentageToGrade(pct: number): Grade {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

export function formatResults(results: CheckResult[], score: ScoreResult, quiet: boolean = false): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('  snaplint, project health report');
  lines.push('  ─────────────────────────────────────');
  lines.push('');
  lines.push(`  Score: ${score.total}/${score.max}  (${score.percentage}%)  Grade: ${gradeEmoji(score.grade)}`);
  lines.push('');

  // By category
  lines.push('  By category:');
  for (const [cat, data] of Object.entries(score.byCategory)) {
    const pct = data.max > 0 ? Math.round((data.score / data.max) * 100) : 100;
    const bar = progressBar(pct, 20);
    lines.push(`    ${cat.padEnd(16)} ${bar} ${data.score}/${data.max}`);
  }
  lines.push('');

  // Failed checks
  const failed = results.filter(r => r.status === 'fail');
  const warned = results.filter(r => r.status === 'warn');
  const passed = results.filter(r => r.status === 'pass');

  if (quiet) {
    if (failed.length === 0 && warned.length === 0) {
      lines.push('  ✓ All checks passed.');
      lines.push('');
    }
  } else {
    if (passed.length > 0) {
      lines.push(`  ✓ ${passed.length} check(s) passed:`);
      for (const r of passed) {
        lines.push(`    ${r.name}: ${r.message}`);
      }
      lines.push('');
    }
  }

  if (failed.length > 0) {
    lines.push(`  ✗ ${failed.length} issue(s):`);
    lines.push('');
    for (const r of failed) {
      lines.push(`  [${r.severity.toUpperCase()}] ${r.name}`);
      lines.push(`    ${r.message}`);
      if (r.detail) lines.push(`    ${r.detail}`);
      if (r.fix) lines.push(`    → Fix: ${r.fix}`);
      lines.push('');
    }
  }

  if (warned.length > 0) {
    lines.push(`  ⚠ ${warned.length} warning(s):`);
    lines.push('');
    for (const r of warned) {
      lines.push(`  [${r.severity.toUpperCase()}] ${r.name}`);
      lines.push(`    ${r.message}`);
      if (r.fix) lines.push(`    → Fix: ${r.fix}`);
      lines.push('');
    }
  }

  // Summary
  lines.push('  ─────────────────────────────────────');
  if (score.percentage >= 90) {
    lines.push('  Excellent! Your project is in great shape.');
  } else if (score.percentage >= 70) {
    lines.push('  Good foundation. A few things to improve.');
  } else if (score.percentage >= 50) {
    lines.push('  Needs work. Focus on the issues above.');
  } else {
    lines.push('  Critical issues. Fix the failures above first.');
  }
  lines.push('');

  return lines.join('\n');
}

export function formatJson(results: CheckResult[], score: ScoreResult): string {
  return JSON.stringify({ score, results }, null, 2);
}

export function formatMarkdown(results: CheckResult[], score: ScoreResult): string {
  const lines: string[] = [];
  lines.push('# snaplint Report');
  lines.push('');
  lines.push(`**Score:** ${score.total}/${score.max} (${score.percentage}%) — Grade: ${score.grade}`);
  lines.push('');

  lines.push('## By Category');
  lines.push('');
  lines.push('| Category | Score | Max | Percentage |');
  lines.push('|----------|-------|-----|------------|');
  for (const [cat, data] of Object.entries(score.byCategory)) {
    const pct = data.max > 0 ? Math.round((data.score / data.max) * 100) : 100;
    lines.push(`| ${cat} | ${data.score} | ${data.max} | ${pct}% |`);
  }
  lines.push('');

  const failed = results.filter(r => r.status === 'fail');
  const warned = results.filter(r => r.status === 'warn');

  if (failed.length > 0) {
    lines.push('## Issues');
    lines.push('');
    for (const r of failed) {
      lines.push(`### ✗ ${r.name} [${r.severity}]`);
      lines.push(`- ${r.message}`);
      if (r.detail) lines.push(`- ${r.detail}`);
      if (r.fix) lines.push(`- **Fix:** ${r.fix}`);
      lines.push('');
    }
  }

  if (warned.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const r of warned) {
      lines.push(`### ⚠ ${r.name} [${r.severity}]`);
      lines.push(`- ${r.message}`);
      if (r.fix) lines.push(`- **Fix:** ${r.fix}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function gradeEmoji(grade: Grade): string {
  const emojis: Record<Grade, string> = {
    A: 'A 🟢',
    B: 'B 🟢',
    C: 'C 🟡',
    D: 'D 🟠',
    F: 'F 🔴',
  };
  return emojis[grade];
}

function progressBar(pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}