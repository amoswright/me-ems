import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIR = path.join(PROJECT_ROOT, 'source-protocols');

interface ColorConfig {
  filename: string;
  color: string;
}

const COLORS_TO_SPLIT: ColorConfig[] = [
  { filename: 'red.html', color: 'red' },
  { filename: 'green.html', color: 'green' },
  { filename: 'yellow.html', color: 'yellow' },
];

function splitCombinedFile(filename: string, color: string) {
  const filePath = path.join(PROJECT_ROOT, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return 0;
  }

  console.log(`\nProcessing ${filename}...`);

  const html = fs.readFileSync(filePath, 'utf-8');

  // Split by <hr /> or <hr> tags
  const pages = html.split(/<hr\s*\/?>/i).filter(page => page.trim().length > 0);

  console.log(`  Found ${pages.length} pages`);

  let filesCreated = 0;

  pages.forEach((pageHtml, index) => {
    const pageNumber = index + 1;
    const paddedNumber = pageNumber.toString().padStart(3, '0');
    const outputFilename = `${color}_${paddedNumber}.html`;
    const outputPath = path.join(SOURCE_DIR, outputFilename);

    // Clean up the page HTML
    let cleanedHtml = pageHtml.trim();

    // Ensure it starts with proper HTML structure if it doesn't already
    if (!cleanedHtml.toLowerCase().startsWith('<')) {
      cleanedHtml = `<div>${cleanedHtml}</div>`;
    }

    // Write the individual file
    fs.writeFileSync(outputPath, cleanedHtml, 'utf-8');
    filesCreated++;

    // Log first and last few files
    if (index < 3 || index >= pages.length - 3) {
      console.log(`  Created: ${outputFilename}`);
    } else if (index === 3) {
      console.log(`  ...`);
    }
  });

  console.log(`✓ Created ${filesCreated} files for ${color}`);
  return filesCreated;
}

console.log('==================================================');
console.log('Maine EMS Protocols - Combined File Splitter');
console.log('==================================================\n');

let totalFiles = 0;

COLORS_TO_SPLIT.forEach(({ filename, color }) => {
  const count = splitCombinedFile(filename, color);
  totalFiles += count;
});

console.log('\n==================================================');
console.log(`✓ Splitting complete!`);
console.log('==================================================');
console.log(`Total files created: ${totalFiles}`);
console.log(`Output directory: ${SOURCE_DIR}\n`);
