import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A new push to a pull request may cancel that PR's older run, but a push to
// main must not cancel the previous main run, or that commit never gets a
// result.

// happy-dom replaces the global URL, so resolve the path with node:path.
const workflowsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');

describe('CI workflow concurrency', () => {
  it.each(['test.yml', 'repository-hygiene.yml'])('%s cancels superseded runs on pull requests only', (file) => {
    const workflow = readFileSync(path.join(workflowsDir, file), 'utf8');
    const values = [...workflow.matchAll(/^\s*cancel-in-progress:\s*(.+?)\s*$/gm)].map(m => m[1]);
    expect(values).toEqual(["${{ github.event_name == 'pull_request' }}"]);
  });
});
