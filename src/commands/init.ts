import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_CONFIG } from '../config.js';

export function initCommand(targetPath: string): void {
  const configPath = path.join(targetPath, '.snaplintrc.json');

  if (fs.existsSync(configPath)) {
    console.log('  .snaplintrc.json already exists. Keeping existing config.');
    return;
  }

  const config = { ...DEFAULT_CONFIG };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');

  console.log(`
  snaplint init
  ─────────────────────────────────────

  Created .snaplintrc.json with default config:

  ${JSON.stringify(config, null, 2)}

  Edit this file to:
    • Enable/disable specific checks
    • Exclude patterns from scanning
    • Set a minimum score threshold (failBelow)
    • Set default output format (text, json, markdown)
`);
}