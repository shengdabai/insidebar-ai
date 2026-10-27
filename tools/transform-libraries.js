// Transform raw JSON libraries to unified schema for import (development tool, not part of the extension).
// Run from the repository root:
//   node tools/transform-libraries.js <ai-meta-prompts-library.json> <research-meta-prompts-library.json>
// Writes data/prompt-libraries/default-prompts.json.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate title from template (first 60 chars)
function generateTitle(template) {
  const cleaned = template.replace(/\{[^}]+\}/g, '…').trim();
  return cleaned.length > 60 ? cleaned.substring(0, 57) + '...' : cleaned;
}

// Transform a single library
function transformLibrary(sourceData) {
  const transformed = [];

  for (const category of sourceData.categories) {
    for (const item of category.items) {
      const prompt = {
        title: generateTitle(item.template),
        content: item.template,
        category: category.name,
        tags: item.tags || [],  // Keep only original tags, no auto-added ones
        variables: item.variables || [],
        isFavorite: false,
        useCount: 0,
        lastUsed: null
      };

      transformed.push(prompt);
    }
  }

  return transformed;
}

// Merge and deduplicate by title
function mergeLibraries(lib1, lib2) {
  const merged = [...lib1, ...lib2];
  const seen = new Set();
  const unique = [];

  for (const prompt of merged) {
    // Deduplicate by title instead of externalId
    const key = prompt.title.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(prompt);
    }
  }

  return unique;
}

// Main transformation
async function main() {
  try {
    console.log('Reading source files...');

    // Source JSON files are passed on the command line (no machine-specific paths in the repo)
    const [aiPath, researchPath] = process.argv.slice(2);
    if (!aiPath || !researchPath) {
      console.error('Usage: node tools/transform-libraries.js <ai-meta-prompts-library.json> <research-meta-prompts-library.json>');
      process.exit(2);
    }

    const aiData = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
    const researchData = JSON.parse(fs.readFileSync(researchPath, 'utf8'));

    console.log(`AI Library: ${aiData.total_templates} templates`);
    console.log(`Research Library: ${researchData.total_templates} templates`);

    // Transform both libraries
    console.log('\nTransforming libraries...');
    const aiTransformed = transformLibrary(aiData);
    const researchTransformed = transformLibrary(researchData);

    console.log(`Transformed AI: ${aiTransformed.length} prompts`);
    console.log(`Transformed Research: ${researchTransformed.length} prompts`);

    // Merge and deduplicate
    const combined = mergeLibraries(aiTransformed, researchTransformed);
    console.log(`Combined (deduplicated): ${combined.length} prompts`);

    // Write single output file
    const outputDir = path.join(__dirname, '..', 'data', 'prompt-libraries');

    fs.writeFileSync(
      path.join(outputDir, 'default-prompts.json'),
      JSON.stringify({
        version: '1.0',
        title: 'Default Prompt Library',
        description: 'Curated meta-prompts for AI workflows, research, coding, and analysis',
        count: combined.length,
        prompts: combined
      }, null, 2)
    );

    console.log('\n✓ Transformation complete!');
    console.log(`  - default-prompts.json (${combined.length} prompts)`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
