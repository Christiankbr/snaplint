#!/usr/bin/env node

import { detectProject } from './project.js';
import { loadConfig, filterChecks } from './config.js';
import { checkReadme, checkLicense, checkGitignore, checkContributing, checkCodeOfConduct, checkChangelog } from './checks/documentation.js';
import { checkEnvFiles, checkSecrets, checkNpmAudit, checkDependabot } from './checks/security.js';
import { checkCIConfig, checkTests, checkLinting, checkFormatter, checkEditorConfig } from './checks/quality.js';
import { checkPackageJson, checkLockfile, checkOutdatedDeps } from './checks/dependencies.js';
import { checkTypeScriptConfig } from './checks/typescript.js';
import { checkHuskyHooks } from './checks/husky.js';
import { checkActionSecurity } from './checks/action-security.js';
import { checkBundleSize } from './checks/bundle-size.js';
import { calculateScore, formatResults, formatJson, formatMarkdown } from './scorer.js';
import { CheckResult } from './types.js';
import { initCommand } from './commands/init.js';
import { fixCommand } from './commands/fix.js';
import { watchCommand } from './commands/watch.js';

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('-') && !a.startsWith('/') && a !== '.' && a !== '..');
const targetPath = args.find(a => !a.startsWith('-') && a !== 'init' && a !== 'fix' && a !== 'watch') || '.';
const formatFlag = args.find(a => a.startsWith('--format'));
const format = formatFlag ? formatFlag.split('=')[1] || 'text' : 'text';
const quietFlag = args.includes('--quiet') || args.includes('-q');
const helpFlag = args.includes('--help') || args.includes('-h');

// Read version from package.json
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkgVersion = require('../package.json').version;

if (helpFlag) {
  console.log(`
  snaplint v${pkgVersion}, zero-config project linter

  Usage:
    snaplint [path] [options]
    snaplint init [path]          Create .snaplintrc.json config file
    snaplint fix [path]            Auto-fix common issues
    snaplint watch [path]          Watch mode, re-scan every 30s

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
    snaplint init                  Create config file
    snaplint fix                   Auto-create missing files
    snaplint watch                 Watch for score changes
`);
  process.exit(0);
}

const versionFlag = args.includes('--version') || args.includes('-v');
if (versionFlag) {
  console.log(`snaplint v${pkgVersion}`);
  process.exit(0);
}

// Handle subcommands
if (command === 'init') {
  const initPath = args.find(a => !a.startsWith('-') && a !== 'init') || '.';
  initCommand(initPath);
  process.exit(0);
}

if (command === 'fix') {
  const fixPath = args.find(a => !a.startsWith('-') && a !== 'fix') || '.';
  fixCommand(fixPath);
  process.exit(0);
}

if (command === 'watch') {
  const watchPath = args.find(a => !a.startsWith('-') && a !== 'watch') || '.';
  watchCommand(watchPath);
  process.exit(0);
}

async function main() {
  const project = detectProject(targetPath);
  const config = loadConfig(targetPath);

  const allChecks: CheckResult[] = [
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
    checkActionSecurity(project),

    // Quality
    checkCIConfig(project),
    checkTests(project),
    checkLinting(project),
    checkFormatter(project),
    checkEditorConfig(project),
    checkTypeScriptConfig(project),
    checkHuskyHooks(project),
    checkBundleSize(project),

    // Dependencies
    checkPackageJson(project),
    checkLockfile(project),
    checkOutdatedDeps(project),
  ];

  // Apply config filters
  const checks = filterChecks(allChecks, config) as CheckResult[];
  const score = calculateScore(checks);

  // Use config format if not explicitly set
  const outputFormat = formatFlag ? format : config.format;

  switch (outputFormat) {
    case 'json':
      console.log(formatJson(checks, score));
      break;
    case 'markdown':
      console.log(formatMarkdown(checks, score));
      break;
    default:
      console.log(formatResults(checks, score, quietFlag));
  }

  // Exit code: 0 if passing, 1 if any failures or below failBelow threshold
  const hasFailures = checks.some(c => c.status === 'fail');
  const belowThreshold = score.percentage < config.failBelow;
  process.exit(hasFailures || belowThreshold ? 1 : 0);
}

main().catch(err => {
  console.error('snaplint error:', err.message);
  process.exit(2);
});