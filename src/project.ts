import * as fs from 'fs';
import * as path from 'path';
import { ProjectInfo, DetectedLanguage } from './types.js';

export function detectProject(root: string): ProjectInfo {
  const name = path.basename(root);
  const language = detectLanguage(root);
  const packageManager = detectPackageManager(root);
  const hasGit = fs.existsSync(path.join(root, '.git'));
  const fileCount = countFiles(root, 0, 0);

  return { root, name, language, packageManager, hasGit, fileCount };
}

function detectLanguage(root: string): DetectedLanguage {
  if (fs.existsSync(path.join(root, 'tsconfig.json'))) return 'typescript';
  if (fs.existsSync(path.join(root, 'package.json'))) return 'javascript';
  if (fs.existsSync(path.join(root, 'Cargo.toml'))) return 'rust';
  if (fs.existsSync(path.join(root, 'pyproject.toml')) || fs.existsSync(path.join(root, 'setup.py')) || fs.existsSync(path.join(root, 'requirements.txt'))) return 'python';
  if (fs.existsSync(path.join(root, 'go.mod'))) return 'go';
  if (fs.existsSync(path.join(root, 'pom.xml')) || fs.existsSync(path.join(root, 'build.gradle'))) return 'java';
  return 'unknown';
}

function detectPackageManager(root: string): string | null {
  if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(root, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(root, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(root, 'Cargo.lock'))) return 'cargo';
  if (fs.existsSync(path.join(root, 'go.sum'))) return 'go';
  if (fs.existsSync(path.join(root, 'poetry.lock'))) return 'poetry';
  if (fs.existsSync(path.join(root, 'Pipfile.lock'))) return 'pipenv';
  return null;
}

function countFiles(root: string, current: number, depth: number): number {
  if (depth > 10) return current;
  const skipDirs = ['node_modules', '.git', 'dist', 'target', '__pycache__', '.next', 'build', 'vendor', '.cache'];

  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name)) {
          current = countFiles(path.join(root, entry.name), current, depth + 1);
        }
      } else {
        current++;
      }
    }
  } catch {
    // permission errors etc
  }

  return current;
}