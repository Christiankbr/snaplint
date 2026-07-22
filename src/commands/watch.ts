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

export function watchCommand(targetPath: string): void {
  console.log(`
  snaplint watch
  ─────────────────────────────────────

  Watching ${targetPath} for changes...
  (Re-scanning every 30 seconds. Press Ctrl+C to stop.)
`);

  let lastScore: number | null = null;

  function scan() {
    const project = detectProject(targetPath);

    const checks: CheckResult[] = [
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

    const score = calculateScore(checks);

    if (lastScore === null) {
      console.log(`  [${new Date().toLocaleTimeString()}] Initial score: ${score.total}/${score.max} (${score.percentage}%) Grade: ${score.grade}`);
      lastScore = score.percentage;
    } else if (score.percentage !== lastScore) {
      const delta = score.percentage - lastScore;
      const arrow = delta > 0 ? '↑' : '↓';
      const sign = delta > 0 ? '+' : '';
      console.log(`  [${new Date().toLocaleTimeString()}] Score: ${score.total}/${score.max} (${score.percentage}%) Grade: ${score.grade} ${arrow} ${sign}${delta}%`);
      lastScore = score.percentage;

      // Show what changed
      const failed = checks.filter(c => c.status === 'fail');
      const warned = checks.filter(c => c.status === 'warn');
      if (failed.length > 0) {
        console.log(`    Issues: ${failed.length} failure(s), ${warned.length} warning(s)`);
      }
    }
  }

  scan();
  const interval = setInterval(scan, 30_000);

  // Graceful exit
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n  Watch stopped. Goodbye! 👋');
    process.exit(0);
  });
}