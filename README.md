# snaplint

> Zero-config project linter. Scan your project, get a health score, fix what's missing.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js->=18-green.svg)](https://nodejs.org/)

**snaplint** scans your project for common issues: missing files, security vulnerabilities, outdated dependencies, absent CI, thin docs, and more. No config needed. Just run it.

## Why?

You start a new project. Everything works. Three months later someone asks: "Where's the LICENSE? Is there CI? Are dependencies outdated? Any known vulnerabilities?" You don't know. snaplint checks all of that in seconds.

## Install

```bash
npm install -g snaplint
```

Or run without installing:

```bash
npx snaplint
```

## Usage

```bash
# Scan current directory
snaplint

# Scan a specific project
snaplint ./my-project

# Output as JSON (great for CI)
snaplint --format=json

# Output as markdown (for PR comments)
snaplint --format=markdown

# Only show failures and warnings
snaplint --quiet
```

### Commands

#### `snaplint init`

Creates a `.snaplintrc.json` config file in your project with default settings:

```bash
snaplint init
snaplint init ./my-project
```

Config schema:

```json
{
  "checks": ["doc-readme", "license", "sec-secrets", ...],
  "exclude": [],
  "failBelow": 50,
  "format": "text"
}
```

- **checks**: List of check IDs to run (empty = all checks)
- **exclude**: Check IDs to exclude
- **failBelow**: Minimum score percentage (exit code 1 if below)
- **format**: Default output format (`text`, `json`, or `markdown`)

#### `snaplint fix`

Automatically creates common missing files:

```bash
snaplint fix
snaplint fix ./my-project
```

Creates:
- `.gitignore` (based on detected language)
- `LICENSE` (MIT by default)
- `.editorconfig`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

Doesn't ask for confirmation. Shows what was created.

#### `snaplint watch`

Watch mode — re-scans every 30 seconds and shows score changes:

```bash
snaplint watch
```

Only shows output when the score changes. Press Ctrl+C to stop.

## What it checks

### Documentation (28 pts)
- README exists and quality (badges, install, usage, license sections)
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- CHANGELOG.md

### Security (30 pts)
- No exposed .env files
- No hardcoded secrets (API keys, tokens, private keys)
- npm audit (vulnerability count)
- Dependabot configuration
- GitHub Actions security (permissions, dangerous triggers)

### Quality (33 pts)
- CI/CD configuration (GitHub Actions, GitLab CI, etc.)
- Test files present
- Linter configuration (ESLint, Clippy, Ruff, etc.)
- Code formatter (Prettier, rustfmt, Black, etc.)
- .editorconfig
- TypeScript config strictness (TS projects only)
- Git hooks (husky, simple-git-hooks, lefthook)
- Bundle size monitoring (JS/TS projects only)

### Structure (5 pts)
- .gitignore exists and is complete for your language

### Dependencies (20 pts)
- package.json health (pinned versions, scripts, engines)
- Lockfile present
- Outdated dependencies count

### License (5 pts)
- LICENSE file present and recognized

**Total: 121 points**

## Scoring

| Grade | Score | Meaning |
|-------|-------|---------|
| A | 90-100% | Excellent, ship it |
| B | 80-89% | Good, minor improvements |
| C | 70-79% | Okay, some work needed |
| D | 60-69% | Needs attention |
| F | < 60% | Critical issues |

## Output example

```
  snaplint, project health report
  ─────────────────────────────────────

  Score: 87/113  (77%)  Grade: C 🟡

  By category:
    documentation    [████████████░░░░░░░░] 18/28
    security         [██████████████████░░] 22/25
    quality          [████████████████░░░░] 24/30
    structure        [████████████████████] 5/5
    dependencies     [████████████████████] 18/20
    license          [████████████████████] 5/5

  ⚠ 3 warning(s):

  [LOW] CHANGELOG.md
    No CHANGELOG.md
    → Fix: Add a CHANGELOG.md following keepachangelog.com format.

  [LOW] Code of Conduct
    No CODE_OF_CONDUCT.md
    → Fix: Add a CODE_OF_CONDUCT.md. Use the Contributor Covenant template.

  [MEDIUM] Outdated dependencies
    7 outdated (2 major)
    → Fix: Run `npm update` or `npm outdated` to review and update.

  ✓ 12 check(s) passed:
    README quality: README is comprehensive
    License file: License: MIT
    ...
```

## In CI

```yaml
# .github/workflows/snaplint.yml
name: snaplint
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npx snaplint --format=markdown >> $GITHUB_STEP_SUMMARY
```

Exits with code 1 if any checks fail, 0 if all pass. Perfect for CI gates.

## Language Support

| Language | Detection | Linter check | Formatter check |
|----------|-----------|--------------|-----------------|
| TypeScript | tsconfig.json | ESLint/Biome | Prettier/Biome |
| JavaScript | package.json | ESLint/Biome | Prettier/Biome |
| Rust | Cargo.toml | Clippy | rustfmt |
| Python | pyproject.toml/setup.py | Flake8/Ruff/Pylint | Black |
| Go | go.mod | golangci-lint | gofmt |
| Java | pom.xml/build.gradle | - | - |

## Privacy

snaplint runs **100% locally**. No telemetry, no cloud, no data leaves your machine. `npm audit` calls npm's registry API but sends only package names/versions.

## Contributing

Contributions welcome! New checks are easy to add:

```bash
git clone https://github.com/christiankbr/snaplint.git
cd snaplint
npm install
npm run build
node dist/index.js
```

See `src/checks/` for existing check patterns. Each check is a function that returns a `CheckResult`.

## License

MIT © Christian Kbr