import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkBundleSize(project: ProjectInfo): CheckResult {
  const maxPoints = 3;
  const root = project.root;

  if (project.language !== 'typescript' && project.language !== 'javascript') {
    return {
      id: 'quality-bundle-size',
      name: 'Bundle size monitoring',
      category: 'quality',
      status: 'skip',
      severity: 'info',
      message: 'Not a JS/TS project',
      points: maxPoints,
      maxPoints,
    };
  }

  const sizeLimitPaths = ['.size-limit.json', '.size-limit.json', '.size-limit', 'size-limit.json'];
  const hasSizeLimit = sizeLimitPaths.some(p => fs.existsSync(path.join(root, p)));

  const pkgPath = path.join(root, 'package.json');
  let hasSizeLimitInPkg = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg['size-limit']) hasSizeLimitInPkg = true;
    } catch { /* */ }
  }

  // Check for bundlesize
  const bundlesizePaths = ['.bundlesize', '.bundlesize.json'];
  const hasBundlesize = bundlesizePaths.some(p => fs.existsSync(path.join(root, p)));
  let hasBundlesizeInPkg = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.bundlesize) hasBundlesizeInPkg = true;
    } catch { /* */ }
  }

  // Check for bundlewatch
  const hasBundlewatch = fs.existsSync(path.join(root, '.bundlewatch.config.json')) ||
    fs.existsSync(path.join(root, '.bundlewatch.json'));

  if (hasSizeLimit || hasSizeLimitInPkg || hasBundlesize || hasBundlesizeInPkg || hasBundlewatch) {
    return {
      id: 'quality-bundle-size',
      name: 'Bundle size monitoring',
      category: 'quality',
      status: 'pass',
      severity: 'info',
      message: 'Bundle size monitoring configured',
      points: maxPoints,
      maxPoints,
    };
  }

  return {
    id: 'quality-bundle-size',
    name: 'Bundle size monitoring',
    category: 'quality',
    status: 'warn',
    severity: 'low',
    message: 'No bundle size monitoring',
    detail: 'Bundle size monitoring helps catch performance regressions.',
    fix: 'Install size-limit (npm i -D @size-limit/file) and add config.',
    points: 0,
    maxPoints,
  };
}