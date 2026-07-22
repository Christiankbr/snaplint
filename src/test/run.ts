import { detectProject } from '../project.js';
import { CheckResult } from '../types.js';
import { checkReadme, checkLicense, checkGitignore, checkContributing, checkCodeOfConduct, checkChangelog } from '../checks/documentation.js';
import { checkEnvFiles, checkSecrets, checkNpmAudit, checkDependabot } from '../checks/security.js';
import { checkCIConfig, checkTests, checkLinting, checkFormatter, checkEditorConfig } from '../checks/quality.js';
import { checkPackageJson, checkLockfile, checkOutdatedDeps } from '../checks/dependencies.js';
import { checkTypeScriptConfig } from '../checks/typescript.js';
import { checkHuskyHooks } from '../checks/husky.js';
import { checkActionSecurity } from '../checks/action-security.js';
import { checkBundleSize } from '../checks/bundle-size.js';
import { calculateScore } from '../scorer.js';
import * as fs from 'fs';
import * as path from 'path';

// Self-test: run snaplint against its own repo
const root = path.resolve(import.meta.dirname, '..', '..');

console.log('snaplint self-test');
console.log('─────────────────────────────────────\n');

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}`);
    failed++;
    failures.push(name);
  }
}

// 1. Project detection
const project = detectProject(root);
assert(project.language === 'typescript', `detectProject: language is typescript (got: ${project.language})`);
assert(project.name === 'snaplint', `detectProject: name is snaplint (got: ${project.name})`);
assert(project.hasGit === true, `detectProject: hasGit is true`);
assert(project.packageManager === 'npm', `detectProject: packageManager is npm (got: ${project.packageManager})`);

// 2. All checks run without throwing
const allChecks: CheckResult[] = [
  checkReadme(project),
  checkLicense(project),
  checkContributing(project),
  checkCodeOfConduct(project),
  checkChangelog(project),
  checkGitignore(project),
  checkEnvFiles(project),
  checkSecrets(project),
  checkNpmAudit(project),
  checkDependabot(project),
  checkCIConfig(project),
  checkTests(project),
  checkLinting(project),
  checkFormatter(project),
  checkEditorConfig(project),
  checkTypeScriptConfig(project),
  checkHuskyHooks(project),
  checkActionSecurity(project),
  checkBundleSize(project),
  checkPackageJson(project),
  checkLockfile(project),
  checkOutdatedDeps(project),
];

for (const check of allChecks) {
  assert(check.status !== undefined, `check ${check.id}: has status`);
  assert(check.points >= 0, `check ${check.id}: points >= 0`);
  assert(check.maxPoints > 0, `check ${check.id}: maxPoints > 0`);
  assert(check.name.length > 0, `check ${check.id}: has name`);
  assert(check.message.length > 0, `check ${check.id}: has message`);
}

// 3. Score calculation
const score = calculateScore(allChecks);
assert(score.total >= 0, `calculateScore: total >= 0 (got: ${score.total})`);
assert(score.max > 0, `calculateScore: max > 0 (got: ${score.max})`);
assert(score.percentage >= 0 && score.percentage <= 100, `calculateScore: percentage in range (got: ${score.percentage})`);
assert(['A', 'B', 'C', 'D', 'F'].includes(score.grade), `calculateScore: valid grade (got: ${score.grade})`);
assert(Object.keys(score.byCategory).length > 0, `calculateScore: has categories`);

// 4. Config defaults
const { DEFAULT_CONFIG } = await import('../config.js');
assert(Array.isArray(DEFAULT_CONFIG.checks), 'DEFAULT_CONFIG: checks is array');
assert(DEFAULT_CONFIG.checks.length > 0, `DEFAULT_CONFIG: has checks (got: ${DEFAULT_CONFIG.checks.length})`);
assert(Array.isArray(DEFAULT_CONFIG.exclude), 'DEFAULT_CONFIG: exclude is array');
assert(typeof DEFAULT_CONFIG.failBelow === 'number', 'DEFAULT_CONFIG: failBelow is number');
assert(DEFAULT_CONFIG.failBelow === 50, `DEFAULT_CONFIG: failBelow is 50 (got: ${DEFAULT_CONFIG.failBelow})`);

// 5. New checks exist and work
const tsConfigCheck = checkTypeScriptConfig(project);
assert(tsConfigCheck.id === 'quality-tsconfig', `checkTypeScriptConfig: correct id`);
assert(tsConfigCheck.status === 'pass', `checkTypeScriptConfig: should pass on snaplint repo (got: ${tsConfigCheck.status})`);

const huskyCheck = checkHuskyHooks(project);
assert(huskyCheck.id === 'quality-husky', `checkHuskyHooks: correct id`);

const actionSecCheck = checkActionSecurity(project);
assert(actionSecCheck.id === 'sec-action-perms', `checkActionSecurity: correct id`);

const bundleCheck = checkBundleSize(project);
assert(bundleCheck.id === 'quality-bundle-size', `checkBundleSize: correct id`);

// 6. Init command creates config
const tempDir = path.join(root, '.test-tmp');
try {
  fs.mkdirSync(tempDir, { recursive: true });
  const { initCommand } = await import('../commands/init.js');
  initCommand(tempDir);
  assert(fs.existsSync(path.join(tempDir, '.snaplintrc.json')), 'initCommand: creates .snaplintrc.json');
  const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.snaplintrc.json'), 'utf-8'));
  assert(config.checks.length > 0, 'initCommand: config has checks');
  assert(config.failBelow === 50, 'initCommand: failBelow is 50');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// 7. Fix command creates files
try {
  fs.mkdirSync(tempDir, { recursive: true });
  const { fixCommand } = await import('../commands/fix.js');
  fixCommand(tempDir);
  assert(fs.existsSync(path.join(tempDir, '.gitignore')), 'fixCommand: creates .gitignore');
  assert(fs.existsSync(path.join(tempDir, 'LICENSE')), 'fixCommand: creates LICENSE');
  assert(fs.existsSync(path.join(tempDir, '.editorconfig')), 'fixCommand: creates .editorconfig');
  assert(fs.existsSync(path.join(tempDir, 'CONTRIBUTING.md')), 'fixCommand: creates CONTRIBUTING.md');
  assert(fs.existsSync(path.join(tempDir, 'CHANGELOG.md')), 'fixCommand: creates CHANGELOG.md');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// Summary
console.log('\n─────────────────────────────────────');
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('\n  Failures:');
  for (const f of failures) {
    console.log(`    ✗ ${f}`);
  }
  process.exit(1);
}
console.log('\n  All tests passed! ✅');
process.exit(0);