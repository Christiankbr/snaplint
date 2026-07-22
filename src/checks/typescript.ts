import * as fs from 'fs';
import * as path from 'path';
import { CheckResult, ProjectInfo } from '../types.js';

export function checkTypeScriptConfig(project: ProjectInfo): CheckResult {
  const maxPoints = 5;
  const tsconfigPath = path.join(project.root, 'tsconfig.json');

  if (project.language !== 'typescript') {
    return {
      id: 'quality-tsconfig',
      name: 'TypeScript config',
      category: 'quality',
      status: 'skip',
      severity: 'info',
      message: 'Not a TypeScript project',
      points: maxPoints,
      maxPoints,
    };
  }

  if (!fs.existsSync(tsconfigPath)) {
    return {
      id: 'quality-tsconfig',
      name: 'TypeScript config',
      category: 'quality',
      status: 'fail',
      severity: 'high',
      message: 'No tsconfig.json found',
      fix: 'Create a tsconfig.json with strict mode enabled.',
      points: 0,
      maxPoints,
    };
  }

  let tsconfig: any;
  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  } catch {
    return {
      id: 'quality-tsconfig',
      name: 'TypeScript config',
      category: 'quality',
      status: 'fail',
      severity: 'high',
      message: 'tsconfig.json is invalid JSON',
      fix: 'Fix the JSON syntax in tsconfig.json.',
      points: 0,
      maxPoints,
    };
  }

  const compilerOptions = tsconfig.compilerOptions || {};
  const issues: string[] = [];
  let points = maxPoints;

  if (!compilerOptions.strict) {
    issues.push('strict mode not enabled');
    points -= 2;
  }

  if (!compilerOptions.noUnusedLocals) {
    issues.push('noUnusedLocals not enabled');
    points -= 1;
  }

  if (!compilerOptions.noUnusedParameters) {
    issues.push('noUnusedParameters not enabled');
    points -= 1;
  }

  if (!compilerOptions.noImplicitReturns) {
    issues.push('noImplicitReturns not enabled');
    points -= 1;
  }

  if (!compilerOptions.forceConsistentCasingInFileNames) {
    issues.push('forceConsistentCasingInFileNames not enabled');
    points -= 1;
  }

  if (issues.length > 0) {
    return {
      id: 'quality-tsconfig',
      name: 'TypeScript config',
      category: 'quality',
      status: points < 3 ? 'fail' : 'warn',
      severity: points < 3 ? 'medium' : 'low',
      message: `tsconfig.json could be stricter`,
      detail: `Missing: ${issues.join(', ')}`,
      fix: 'Enable strict, noUnusedLocals, noUnusedParameters, noImplicitReturns in tsconfig.json.',
      points: Math.max(0, points),
      maxPoints,
    };
  }

  return {
    id: 'quality-tsconfig',
    name: 'TypeScript config',
    category: 'quality',
    status: 'pass',
    severity: 'info',
    message: 'tsconfig.json is strict and well-configured',
    points: maxPoints,
    maxPoints,
  };
}