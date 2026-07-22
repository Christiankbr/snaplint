#!/usr/bin/env node

import { detectProject } from './project.js';
import { checkReadme, checkLicense, checkGitignore, checkContributing, checkCodeOfConduct, checkChangelog } from './checks/documentation.js';
import { checkEnvFiles, checkSecrets, checkNpmAudit, checkDependabot } from './checks/security.js';
import { checkCIConfig, checkTests, checkLinting, checkFormatter, checkEditorConfig } from './checks/quality.js';
import { checkPackageJson, checkLockfile, checkOutdatedDeps } from './checks/dependencies.js';
import { calculateScore, formatResults, formatJson, formatMarkdown } from './scorer.js';
import { CheckResult } from './types.js';

const args = process.argv.slice(2);
const targetPath = args.find(a => !a.startsWith('-')) || '.';
const formatFlag = args.find(a => a.startsWith('--format'));
const format = formatFlag ? formatFlag.split('=')[1] || 'text' : 'text';
const quietFlag = args.includes('--quiet') || args.includes('-q');
const helpFlag = args.includes('--help') || args.includes('-h');

if (helpFlag) {
  console.log(`
  snaplint, zero-config project linter

  Usage:
    snaplint [path] [options]

  Options:
    --format=<text|json|markdown>  Output format (default: text)
    --quiet, -q                    Only show failures and warnings
    --help, -h                     Show this help
    --version, -v                  Show version

  Examples:
    snaplint                       Scan current directory
    snaplint ./my-project          Scan specific project
    snaplint --format=json         Output as JSON
    snaplint --format=markdown     Output as markdown
`);
  process.exit(0);
}

const versionFlag = args.includes('--version') || args.includes('-v');
if (versionFlag) {
  console.log('snaplint v0.1.0');
  process.exit(0);
}

async function main() {
  const project = detectProject(targetPath);

  const checks: CheckResult[] = [
    // Documentation
    checkReadme(project),
    checkLicense(project),
    checkContributing(project),
    checkCodeOfConduct(project),
    checkChangelog(project),
    checkGitignore(project),

    // Security
    checkEnvFiles(project),
    checkSecrets(project),
    checkNpmAudit(project),
    checkDependabot(project),

    // Quality
    checkCIConfig(project),
    checkTests(project),
    checkLinting(project),
    checkFormatter(project),
    checkEditorConfig(project),

    // Dependencies
    checkPackageJson(project),
    checkLockfile(project),
    checkOutdatedDeps(project),
  ];

  const score = calculateScore(checks);

  switch (format) {
    case 'json':
      console.log(formatJson(checks, score));
      break;
    case 'markdown':
      console.log(formatMarkdown(checks, score));
      break;
    default:
      console.log(formatResults(checks, score));
  }

  // Exit code: 0 if passing, 1 if any failures
  const hasFailures = checks.some(c => c.status === 'fail');
  process.exit(hasFailures ? 1 : 0);
}

main().catch(err => {
  console.error('snaplint error:', err.message);
  process.exit(2);
});