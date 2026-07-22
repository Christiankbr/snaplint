import * as fs from 'fs';
import * as path from 'path';
import { DetectedLanguage } from '../types.js';
import { detectProject } from '../project.js';

export function fixCommand(targetPath: string): void {
  const project = detectProject(targetPath);
  const actions: string[] = [];

  // 1. .gitignore
  const gitignorePath = path.join(targetPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = generateGitignore(project.language);
    fs.writeFileSync(gitignorePath, gitignoreContent + '\n');
    actions.push(`Created .gitignore (for ${project.language})`);
  }

  // 2. LICENSE
  const licensePath = path.join(targetPath, 'LICENSE');
  const licensePaths = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'];
  const hasLicense = licensePaths.some(p => fs.existsSync(path.join(targetPath, p)));
  if (!hasLicense) {
    const year = new Date().getFullYear();
    const author = detectAuthor(targetPath);
    const licenseContent = `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    fs.writeFileSync(licensePath, licenseContent);
    actions.push('Created LICENSE (MIT)');
  }

  // 3. .editorconfig
  const editorconfigPath = path.join(targetPath, '.editorconfig');
  if (!fs.existsSync(editorconfigPath)) {
    const editorconfigContent = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
`;
    fs.writeFileSync(editorconfigPath, editorconfigContent);
    actions.push('Created .editorconfig');
  }

  // 4. CONTRIBUTING.md
  const contributingPath = path.join(targetPath, 'CONTRIBUTING.md');
  if (!fs.existsSync(contributingPath)) {
    const projectName = path.basename(targetPath);
    const contributingContent = `# Contributing to ${projectName}

Thanks for your interest in contributing! 🎉

## Getting Started

1. Fork the repository
2. Clone your fork: \`git clone https://github.com/YOUR-USERNAME/${projectName}.git\`
3. Install dependencies: \`npm install\`
4. Build: \`npm run build\`
5. Run tests: \`npm test\`

## Development Workflow

1. Create a branch: \`git checkout -b feature/my-feature\`
2. Make your changes
3. Run checks: \`npm run build && npm test\`
4. Commit with clear messages
5. Push and open a Pull Request

## Code Style

- Follow the existing code style
- Run the linter before committing
- Keep PRs focused and small

## Pull Requests

- One feature/fix per PR
- Include a clear description
- Update docs if needed
- Ensure CI passes

## Reporting Issues

Use GitHub Issues. Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## License

By contributing, you agree that your contributions are licensed under the MIT License.
`;
    fs.writeFileSync(contributingPath, contributingContent);
    actions.push('Created CONTRIBUTING.md');
  }

  // 5. CHANGELOG.md
  const changelogPath = path.join(targetPath, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    const changelogContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release

## [0.1.0] - ${new Date().toISOString().split('T')[0]}

### Added

- Initial project setup
`;
    fs.writeFileSync(changelogPath, changelogContent);
    actions.push('Created CHANGELOG.md');
  }

  // Summary
  console.log(`
  snaplint fix
  ─────────────────────────────────────

  ${actions.length > 0 ? 'Applied fixes:' : 'Nothing to fix, everything looks good!'}

${actions.map(a => `  ✓ ${a}`).join('\n')}

  ${actions.length > 0 ? `Run \`snaplint\` again to see your improved score.` : ''}
`);
}

function generateGitignore(language: DetectedLanguage): string {
  const common = [
    '# Dependencies',
    'node_modules/',
    '',
    '# Build output',
    'dist/',
    'build/',
    'target/',
    '',
    '# Environment',
    '.env',
    '.env.local',
    '.env.*.local',
    '',
    '# Editor',
    '.vscode/',
    '.idea/',
    '*.swp',
    '*.swo',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# Logs',
    '*.log',
    'npm-debug.log*',
    '',
  ];

  if (language === 'typescript' || language === 'javascript') {
    return [...common, '# TypeScript', '*.tsbuildinfo', ''].join('\n');
  }

  if (language === 'python') {
    return [
      '# Python',
      '__pycache__/',
      '*.pyc',
      '*.pyo',
      '*.egg-info/',
      '.venv/',
      'venv/',
      '',
      ...common,
    ].join('\n');
  }

  if (language === 'rust') {
    return [
      '# Rust',
      '/target',
      '**/*.rs.bk',
      '',
      ...common,
    ].join('\n');
  }

  if (language === 'go') {
    return [
      '# Go',
      '*.exe',
      '*.exe~',
      '*.dll',
      '*.so',
      '*.dylib',
      '*.test',
      '*.out',
      '/vendor',
      '',
      ...common,
    ].join('\n');
  }

  return common.join('\n');
}

function detectAuthor(targetPath: string): string {
  const pkgPath = path.join(targetPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.author) {
        if (typeof pkg.author === 'string') {
          return pkg.author.replace(/\s*<.*>/, '').trim();
        }
        return pkg.author.name || 'Project Owner';
      }
    } catch { /* */ }
  }
  return 'Project Owner';
}