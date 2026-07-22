import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkCIConfig(project: ProjectInfo): CheckResult {
  const maxPoints = 10;
  const root = project.root;

  const ciPaths = [
    '.github/workflows',
    '.gitlab-ci.yml',
    '.circleci/config.yml',
    'azure-pipelines.yml',
    'Jenkinsfile',
    '.travis.yml',
    'cloudbuild.yaml',
  ];

  const found: string[] = [];
  for (const p of ciPaths) {
    const fullPath = path.join(root, p);
    if (p.includes('workflows')) {
      if (fs.existsSync(fullPath)) {
        try {
          const files = fs.readdirSync(fullPath);
          if (files.some(f => f.endsWith('.yml') || f.endsWith('.yaml'))) {
            found.push('GitHub Actions');
          }
        } catch { /* */ }
      }
    } else if (fs.existsSync(fullPath)) {
      found.push(p);
    }
  }

  if (found.length === 0) {
    return {
      id: 'ci-config',
      name: 'CI/CD configuration',
      category: 'ci',
      status: 'fail',
      severity: 'high',
      message: 'No CI/CD found',
      detail: 'Without CI, there is no automated testing or builds.',
      fix: 'Add a GitHub Actions workflow in .github/workflows/ that runs tests on push.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'ci-config',
    name: 'CI/CD configuration',
    category: 'ci',
    status: 'pass',
    severity: 'info',
    message: `CI: ${found.join(', ')}`,
    points: maxPoints,
    maxPoints,
  };
}

export function checkTests(project: ProjectInfo): CheckResult {
  const maxPoints = 10;
  const root = project.root;

  const testDirs = ['test', 'tests', '__tests__', 'spec', 'specs'];
  const testPatterns = [/\.test\.(ts|js|tsx|jsx)$/, /\.spec\.(ts|js|tsx|jsx)$/, /test_.*\.py$/, /.*_test\.go$/, /.*_test\.rs$/];

  let testFileCount = 0;

  function scan(dir: string, depth: number) {
    if (depth > 8) return;
    const skipDirs = ['node_modules', '.git', 'dist', 'target', '__pycache__', 'vendor', '.cache', 'build'];
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!skipDirs.includes(entry.name)) {
            scan(path.join(dir, entry.name), depth + 1);
          }
        } else {
          if (testPatterns.some(p => p.test(entry.name))) {
            testFileCount++;
          }
          // Also check test directories
          if (testDirs.includes(path.basename(dir)) && /\.(ts|js|py|go|rs|java)$/.test(entry.name)) {
            testFileCount++;
          }
        }
      }
    } catch { /* */ }
  }

  scan(root, 0);

  if (testFileCount === 0) {
    return {
      id: 'quality-tests',
      name: 'Test files',
      category: 'quality',
      status: 'fail',
      severity: 'high',
      message: 'No test files found',
      detail: 'Tests are critical for code quality and confidence.',
      fix: 'Add tests. Even a basic smoke test is better than nothing.',
      points: 0,
      maxPoints,
    };
  }

  if (testFileCount < 3) {
    return {
      id: 'quality-tests',
      name: 'Test files',
      category: 'quality',
      status: 'warn',
      severity: 'medium',
      message: `Only ${testFileCount} test file(s)`,
      fix: 'Aim for at least one test file per module.',
      points: 5,
      maxPoints,
    };
  }

  return {
    id: 'quality-tests',
    name: 'Test files',
    category: 'quality',
    status: 'pass',
    severity: 'info',
    message: `${testFileCount} test files found`,
    points: maxPoints,
    maxPoints,
  };
}

export function checkLinting(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const root = project.root;

  const linters: Record<string, string[]> = {
    typescript: ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc', 'eslint.config.js', 'eslint.config.mjs', 'biome.json'],
    javascript: ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc', 'eslint.config.js', 'eslint.config.mjs', 'biome.json'],
    rust: ['clippy.toml', '.clippy.toml'],
    python: ['.flake8', 'setup.cfg', 'pyproject.toml', '.ruff.toml', 'ruff.toml', '.pylintrc'],
    go: ['.golangci.yml', '.golangci.yaml', '.golangci.toml'],
  };

  const langLinters = linters[project.language] || [];
  const found = langLinters.some(f => fs.existsSync(path.join(root, f)));

  if (!found && project.language !== 'unknown') {
    return {
      id: 'quality-lint',
      name: 'Linter config',
      category: 'quality',
      status: 'warn',
      severity: 'medium',
      message: `No linter config for ${project.language}`,
      fix: `Add a linter config for ${project.language}.`,
      points: 1,
      maxPoints,
    };
  }

  if (project.language === 'unknown') {
    return {
      id: 'quality-lint',
      name: 'Linter config',
      category: 'quality',
      status: 'skip',
      severity: 'info',
      message: 'Unknown language, skipping linter check',
      points: maxPoints,
      maxPoints,
    };
  }

  return {
    id: 'quality-lint',
    name: 'Linter config',
    category: 'quality',
    status: 'pass',
    severity: 'info',
    message: 'Linter configured',
    points: maxPoints,
    maxPoints,
  };
}

export function checkFormatter(project: ProjectInfo): CheckResult {
  const maxPoints = 3;
  const root = project.root;

  const formatters: Record<string, string[]> = {
    typescript: ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js', 'biome.json', '.editorconfig'],
    javascript: ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js', 'biome.json', '.editorconfig'],
    rust: ['rustfmt.toml', '.rustfmt.toml'],
    python: ['pyproject.toml', '.black', 'setup.cfg'],
    go: ['.gofmt', '.editorconfig'],
  };

  const langFormatters = formatters[project.language] || [];
  const found = langFormatters.some(f => fs.existsSync(path.join(root, f)));

  if (!found && project.language !== 'unknown') {
    return {
      id: 'quality-format',
      name: 'Code formatter',
      category: 'quality',
      status: 'warn',
      severity: 'low',
      message: `No formatter config for ${project.language}`,
      fix: 'Add a formatter config (prettier, rustfmt, black, etc).',
      points: 1,
      maxPoints,
    };
  }

  if (project.language === 'unknown') {
    return {
      id: 'quality-format',
      name: 'Code formatter',
      category: 'quality',
      status: 'skip',
      severity: 'info',
      message: 'Unknown language, skipping formatter check',
      points: maxPoints,
      maxPoints,
    };
  }

  return {
    id: 'quality-format',
    name: 'Code formatter',
    category: 'quality',
    status: 'pass',
    severity: 'info',
    message: 'Formatter configured',
    points: maxPoints,
    maxPoints,
  };
}

export function checkEditorConfig(project: ProjectInfo): CheckResult {
  const maxPoints = 2;
  const editorconfigPath = path.join(project.root, '.editorconfig');

  if (!fs.existsSync(editorconfigPath)) {
    return {
      id: 'quality-editorconfig',
      name: '.editorconfig',
      category: 'quality',
      status: 'warn',
      severity: 'low',
      message: 'No .editorconfig',
      fix: 'Add an .editorconfig file for consistent editor settings.',
      points: 0,
      maxPoints,
    };
  }

  return {
    id: 'quality-editorconfig',
    name: '.editorconfig',
    category: 'quality',
    status: 'pass',
    severity: 'info',
    message: '.editorconfig exists',
    points: maxPoints,
    maxPoints,
  };
}