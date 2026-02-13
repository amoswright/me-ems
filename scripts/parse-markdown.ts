import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MARKDOWN_FILE = path.join(PROJECT_ROOT, 'meems2025.md');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'meems-protocols-pwa/public/data');

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  brown: '#8B4513',
  purple: '#800080',
  blue: '#0066CC',
  red: '#DC143C',
  gold: '#DAA520',
  green: '#228B22',
  yellow: '#FFD700',
  lavender: '#E6E6FA',
  pink: '#FFC0CB',
  orange: '#FF8C00',
  grey: '#808080',
};

const CATEGORY_NAMES: Record<string, string> = {
  brown: 'Foreword',
  purple: 'Definitions',
  blue: 'Respiratory',
  red: 'Cardiac',
  gold: 'General Medical',
  green: 'Trauma',
  yellow: 'Toxicologic',
  lavender: 'Obstetric',
  pink: 'Pediatric',
  orange: 'Behavioral',
  grey: 'Operations',
};

interface TOCEntry {
  name: string;
  category: string;
  colorAndNumber: string; // e.g., "Blue 6 - 8"
  startPage: number;
  endPage: number;
}

interface Page {
  pageNumber: number;
  title: string;
  content: string;
  colorCode?: string; // e.g., "Blue 6"
}

console.log('==================================================');
console.log('Maine EMS Protocols - Markdown Parser');
console.log('==================================================\n');

// Read the markdown file
console.log('Reading markdown file...');
const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf-8');

// Step 1: Extract TOC
console.log('Extracting table of contents...\n');
const tocEntries: TOCEntry[] = [];

// Find TOC sections (they have tables)
const tocPattern = /<table>[\s\S]*?<\/table>/g;
const tables = markdown.match(tocPattern) || [];

for (const table of tables) {
  // Extract rows
  const rowPattern = /<tr>[\s\S]*?<\/tr>/g;
  const rows = table.match(rowPattern) || [];

  for (const row of rows) {
    // Skip header rows
    if (row.includes('<th>')) continue;

    // Extract cells
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells: string[] = [];
    let cellMatch;

    while ((cellMatch = cellPattern.exec(row)) !== null) {
      cells.push(cellMatch[1].trim().replace(/<[^>]+>/g, '').trim());
    }

    if (cells.length >= 2) {
      const protocolName = cells[0];
      const colorAndNumber = cells[1];

      // Skip special rows
      if (protocolName.includes('ANNEX') || !colorAndNumber) continue;

      // Parse color and page range
      const colorMatch = colorAndNumber.match(/^(Brown|Purple|Blue|Red|Gold|Green|Yellow|Lavender|Pink|Orange|Grey)\s+(.+)$/i);

      if (colorMatch) {
        const category = colorMatch[1].toLowerCase();
        const pageRange = colorMatch[2].trim();

        // Parse page range (e.g., "6 - 8" or "6" or "6-8")
        const rangeMatch = pageRange.match(/(\d+)(?:\s*-\s*|\s+to\s+)?(\d+)?/);

        if (rangeMatch) {
          const startPage = parseInt(rangeMatch[1]);
          const endPage = rangeMatch[2] ? parseInt(rangeMatch[2]) : startPage;

          tocEntries.push({
            name: protocolName,
            category,
            colorAndNumber,
            startPage,
            endPage,
          });
        }
      }
    }
  }
}

console.log(`Found ${tocEntries.length} protocols in TOC\n`);

// Step 2: Parse all pages
console.log('Parsing pages...');

const pageRegex = /^## Page (\d+)/gm;
const pages: Page[] = [];
const pageSections = markdown.split(pageRegex).slice(1); // Remove before first page

for (let i = 0; i < pageSections.length; i += 2) {
  const pageNumberStr = pageSections[i];
  const content = pageSections[i + 1] || '';

  const pageNumber = parseInt(pageNumberStr);

  // Find title (first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract color code from footer
  // Format 1: (Back to TOC) &lt;page_number&gt;Color N&lt;/page_number&gt;
  // Format 2: (Back to TOC)\nColor N
  let colorCode = '';
  let match = content.match(/\(Back to TOC\)\s*&lt;page_number&gt;([^&]+)&lt;\/page_number&gt;/);
  if (match) {
    colorCode = match[1].trim();
  } else {
    match = content.match(/\(Back to TOC\)\s*\n\s*([A-Za-z]+\s+\d+)/);
    if (match) {
      colorCode = match[1].trim();
    }
  }

  pages.push({
    pageNumber,
    title,
    content,
    colorCode,
  });
}

console.log(`Parsed ${pages.length} pages\n`);

// Step 3: Build a mapping of color+page to protocol ID for cross-referencing
console.log('Building protocol reference map...\n');

const protocolRefMap = new Map<string, string>(); // Maps "blue_6" to protocol ID

for (const tocEntry of tocEntries) {
  const protocolId = `${tocEntry.category}_${tocEntry.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

  for (let pageNum = tocEntry.startPage; pageNum <= tocEntry.endPage; pageNum++) {
    const refKey = `${tocEntry.category}_${pageNum}`;
    protocolRefMap.set(refKey, protocolId);
  }
}

console.log(`Created reference map with ${protocolRefMap.size} entries\n`);

// Step 4: Build protocols from TOC and pages
console.log('Building protocols...\n');

const protocols = new Map<string, any>();

for (const tocEntry of tocEntries) {
  // Find pages for this protocol
  const protocolPages = [];

  for (let pageNum = tocEntry.startPage; pageNum <= tocEntry.endPage; pageNum++) {
    // Find the actual page in the document
    // Page numbers in TOC refer to the color codes (e.g., Blue 6)
    // We need to find pages with matching color codes

    const matchingPages = pages.filter(p => {
      if (!p.colorCode) return false;

      const colorMatch = p.colorCode.match(/^(Brown|Purple|Blue|Red|Gold|Green|Yellow|Lavender|Pink|Orange|Grey)\s+(\d+)$/i);
      if (!colorMatch) return false;

      const pageCategory = colorMatch[1].toLowerCase();
      const pageNumber = parseInt(colorMatch[2]);

      return pageCategory === tocEntry.category && pageNumber === pageNum;
    });

    protocolPages.push(...matchingPages);
  }

  if (protocolPages.length === 0) continue;

  // Create protocol ID
  const protocolId = `${tocEntry.category}_${tocEntry.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

  // Parse pages with provider level tracking
  const parsedPages = [];
  let lastProviderLevel = 'ALL';

  for (let idx = 0; idx < protocolPages.length; idx++) {
    const page = protocolPages[idx];
    const isContinuation = page.content.includes('(Continued from previous page)') || page.content.includes('(continued)');

    // If this is a continuation page, start with the previous page's final provider level
    const initialLevel = isContinuation ? lastProviderLevel : 'ALL';
    const { sections, finalProviderLevel } = parsePageContent(page.content, protocolRefMap, initialLevel);

    // Track the final provider level for the next page
    lastProviderLevel = finalProviderLevel;

    parsedPages.push({
      pageId: `${tocEntry.category}_page_${page.pageNumber}`,
      pageNumber: page.colorCode || `${tocEntry.category} ${idx + 1}`,
      jpgReference: `/page_jpg/${String(page.pageNumber).padStart(3, '0')}.jpg`,
      isContinuation,
      sections,
    });
  }

  const protocol = {
    id: protocolId,
    title: tocEntry.name,
    category: tocEntry.category,
    pages: parsedPages,
  };

  protocols.set(protocolId, protocol);
}

console.log(`Built ${protocols.size} protocols\n`);

// Step 4: Organize by category
const categoryProtocols = new Map<string, any[]>();

for (const protocol of protocols.values()) {
  if (!categoryProtocols.has(protocol.category)) {
    categoryProtocols.set(protocol.category, []);
  }
  categoryProtocols.get(protocol.category)!.push(protocol);
}

// Step 5: Generate TOC
console.log('Generating table of contents...');

const categories = Array.from(categoryProtocols.keys())
  .filter(cat => CATEGORY_NAMES[cat])
  .map(categoryId => ({
    id: categoryId,
    name: CATEGORY_NAMES[categoryId],
    displayName: `${categoryId.charAt(0).toUpperCase() + categoryId.slice(1)} - ${CATEGORY_NAMES[categoryId]}`,
    color: CATEGORY_COLORS[categoryId],
    protocols: (categoryProtocols.get(categoryId) || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      pageCount: p.pages.length,
    })),
  }));

const toc = {
  title: 'Maine EMS Protocols 2025',
  categories,
  metadata: {
    parsedAt: new Date().toISOString(),
    totalProtocols: protocols.size,
    totalCategories: categories.length,
  },
};

// Write files
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'toc.json'),
  JSON.stringify(toc, null, 2)
);
console.log('✓ Generated toc.json');

// Write protocol files by category
const protocolsDir = path.join(OUTPUT_DIR, 'protocols');
fs.mkdirSync(protocolsDir, { recursive: true });

for (const [categoryId, categoryProtos] of categoryProtocols) {
  if (!CATEGORY_NAMES[categoryId]) continue;

  fs.writeFileSync(
    path.join(protocolsDir, `${categoryId}.json`),
    JSON.stringify(categoryProtos, null, 2)
  );

  console.log(`✓ Generated ${categoryId}.json (${categoryProtos.length} protocols)`);
}

// Generate search index
console.log('\nGenerating search index...');

const searchIndex = Array.from(protocols.values()).map((protocol: any) => ({
  id: protocol.id,
  title: protocol.title,
  category: protocol.category,
  categoryName: CATEGORY_NAMES[protocol.category] || protocol.category,
  content: protocol.pages.map((p: any) =>
    p.sections.map((s: any) => stripMarkdown(s.content || '')).join(' ')
  ).join(' ').substring(0, 500),
}));

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'search-index.json'),
  JSON.stringify(searchIndex, null, 2)
);

console.log(`✓ Generated search-index.json (${searchIndex.length} entries)`);

// Generate metadata
const metadata = {
  version: '1.0.0',
  source: 'meems2025.md',
  parsedAt: new Date().toISOString(),
  totalProtocols: protocols.size,
  totalPages: pages.length,
  categories: categories.length,
};

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'metadata.json'),
  JSON.stringify(metadata, null, 2)
);

console.log('✓ Generated metadata.json');

console.log('\n==================================================');
console.log('✓ Parsing complete!');
console.log('==================================================');
console.log(`Total protocols: ${metadata.totalProtocols}`);
console.log(`Total pages: ${metadata.totalPages}`);
console.log(`Categories: ${metadata.categories}\n`);

// Helper functions
function parsePageContent(content: string, refMap: Map<string, string>, initialProviderLevel: string = 'ALL'): { sections: any[], finalProviderLevel: string } {
  const sections: any[] = [];
  let currentProviderLevel = initialProviderLevel;
  let providerLevelBeforePearls: string | null = null; // Track level before PEARLS interruption
  let currentPearlsTitle: string | null = null;
  let buffer: string[] = [];

  const lines = content.split('\n');

  for (const line of lines) {
    // Skip footer markers
    if (line.includes('<page_number>') || line.includes('(Back to TOC)') || line.trim() === '---') {
      continue;
    }

    // Detect inline PEARLS sections (e.g., **PEARLS for Seizures:** or **PEARLS for Management of ...**)
    const inlinePearlsMatch = line.match(/^\*\*PEARLS\s+for\s+([^:*]+)[:*]/i);

    if (inlinePearlsMatch) {
      // Save previous section
      if (buffer.length > 0) {
        sections.push(createSection(buffer.join('\n'), currentProviderLevel, refMap, currentPearlsTitle));
        buffer = [];
      }

      // Save the current provider level before entering PEARLS
      providerLevelBeforePearls = currentProviderLevel;

      // Extract PEARLS title and set provider level
      currentPearlsTitle = inlinePearlsMatch[1].trim();
      currentProviderLevel = 'PEARLS';
      // Include the line with the PEARLS header in the content
      buffer.push(line);
      continue;
    }

    // Detect numbered/lettered list items that might indicate end of PEARLS
    const listItemMatch = line.match(/^(\s*)(\d+|[a-z]|i+|iv|v|vi{0,3}|ix|x)\.\s+/);
    if (listItemMatch && currentProviderLevel === 'PEARLS' && providerLevelBeforePearls) {
      // Check if this looks like a continuation of a protocol (not a PEARLS bullet)
      // PEARLS typically use unordered lists (*), not numbered/lettered lists
      const indent = listItemMatch[1];
      const number = listItemMatch[2];

      // If it's a numeric step or has minimal indentation, it's likely continuing the protocol
      if (/^\d+$/.test(number) || indent.length < 4) {
        // Save the PEARLS section
        if (buffer.length > 0) {
          sections.push(createSection(buffer.join('\n'), currentProviderLevel, refMap, currentPearlsTitle));
          buffer = [];
        }

        // Revert to the provider level before PEARLS
        currentProviderLevel = providerLevelBeforePearls;
        providerLevelBeforePearls = null;
        currentPearlsTitle = null;
      }
    }

    // Detect provider level headers (both **EMT** bold format and ## EMT header format)
    // Also detect PEARLS sections
    const providerMatch = line.match(/^(?:\*\*(EMT\/ADVANCED EMT\/PARAMEDIC|ADVANCED EMT\/PARAMEDIC|EMT\/ADVANCED EMT|ADVANCED EMT|PARAMEDIC|EMT)\*\*|##\s+(EMT\/ADVANCED EMT\/PARAMEDIC|ADVANCED EMT\/PARAMEDIC|EMT\/ADVANCED EMT|ADVANCED EMT|PARAMEDIC|EMT|PEARLS))/);
    const pearlsMatch = line.match(/^##\s+PEARLS/i);

    if (providerMatch || pearlsMatch) {
      // Save previous section
      if (buffer.length > 0) {
        sections.push(createSection(buffer.join('\n'), currentProviderLevel, refMap, currentPearlsTitle));
        buffer = [];
      }

      // Update provider level (check both capture groups since we have two patterns)
      if (pearlsMatch) {
        // Save the current provider level before entering PEARLS
        providerLevelBeforePearls = currentProviderLevel;
        currentProviderLevel = 'PEARLS';
        // Check if there's a title in the PEARLS header
        const pearlsTitleMatch = line.match(/^##\s+PEARLS\s+for\s+(.+)/i);
        currentPearlsTitle = pearlsTitleMatch ? pearlsTitleMatch[1].trim() : null;
      } else {
        const level = providerMatch[1] || providerMatch[2];
        currentProviderLevel = mapProviderLevel(level);
        providerLevelBeforePearls = null; // Clear saved level when explicitly changing
        currentPearlsTitle = null; // Reset PEARLS title when switching to non-PEARLS section
      }
      continue;
    }

    buffer.push(line);
  }

  // Save final section
  if (buffer.length > 0) {
    sections.push(createSection(buffer.join('\n'), currentProviderLevel, refMap, currentPearlsTitle));
  }

  return {
    sections: sections.filter(s => s.content.trim().length > 0),
    finalProviderLevel: currentProviderLevel,
  };
}

function createSection(content: string, providerLevel: string, refMap: Map<string, string>, pearlsTitle: string | null = null) {
  const html = markdownToHtml(content.trim());
  const linkedHtml = linkProtocolReferences(html, refMap);

  const section: any = {
    type: 'content',
    providerLevel,
    content: content.trim(),
    html: linkedHtml,
  };

  // Add PEARLS title if present
  if (pearlsTitle && providerLevel === 'PEARLS') {
    section.pearlsTitle = pearlsTitle;
  }

  return section;
}

function mapProviderLevel(level: string): string {
  // Preserve combined levels
  if (level === 'EMT/ADVANCED EMT/PARAMEDIC') return 'EMT_ADVANCED_EMT_PARAMEDIC';
  if (level === 'ADVANCED EMT/PARAMEDIC') return 'ADVANCED_EMT_PARAMEDIC';
  if (level === 'EMT/ADVANCED EMT') return 'EMT_ADVANCED_EMT';
  if (level === 'PARAMEDIC') return 'PARAMEDIC';
  if (level === 'ADVANCED EMT') return 'ADVANCED_EMT';
  if (level === 'EMT') return 'EMT';
  if (level === 'PEARLS') return 'PEARLS';
  return 'ALL';
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let inOrderedList = false;
  let inUnorderedList = false;
  let currentListStart: number | null = null;
  let pendingListItem: string | null = null;

  // Stack to track open list contexts: { indent: number, type: 'ol'|'ul', listType: 'a'|'i'|'1'|null }
  const listStack: Array<{ indent: number, type: string, listType: string | null }> = [];

  // Helper to detect roman numerals
  const isRomanNumeral = (str: string): boolean => {
    return /^(i{1,3}|iv|v|vi{0,3}|ix|x)$/i.test(str);
  };

  // Helper to close lists down to a specific indentation level
  const closeListsToIndent = (targetIndent: number) => {
    while (listStack.length > 0 && listStack[listStack.length - 1].indent >= targetIndent) {
      const closedList = listStack.pop();
      result.push('</ol>');
      if (listStack.length > 0 && pendingListItem !== null) {
        result.push('</li>');
        pendingListItem = null;
      }
    }
  }; // Track unclosed <li> for nesting
  let inMermaid = false; // Track if we're inside a mermaid block

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check for mermaid tags - preserve content as-is
    if (line.trim() === '<mermaid>') {
      inMermaid = true;
      result.push(line);
      continue;
    }
    if (line.trim() === '</mermaid>') {
      inMermaid = false;
      result.push(line);
      continue;
    }
    if (inMermaid) {
      // Inside mermaid block - remove <br> tags and escape special characters
      line = line.replace(/<br\/?>/g, ' ');
      // Escape parentheses which Mermaid interprets as node shape syntax
      line = line.replace(/\(/g, '#40;').replace(/\)/g, '#41;');
      result.push(line);
      continue;
    }

    // Convert bold and italic
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

    // Check for numbered list items (e.g., "1. Item" or "    a. Sub-item")
    const numberedMatch = line.match(/^(\s*)(\d+|[a-z]|i+|iv|v|vi{0,3}|ix|x)\.\s+(.+)$/);
    if (numberedMatch) {
      const indent = numberedMatch[1];
      const number = numberedMatch[2];
      const content = numberedMatch[3];
      const indentLevel = indent.length;
      const isLetter = /^[a-z]$/.test(number);
      const isRoman = isRomanNumeral(number);

      // Determine the type of list this item belongs to
      let listType: string | null = null;
      if (isRoman) listType = 'i';
      else if (isLetter) listType = 'a';
      else listType = '1';

      // Check if next line has deeper nesting
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      const nextMatch = nextLine.match(/^(\s*)([a-z]|i+|iv|v|vi{0,3}|ix|x)\.\s+/);
      const nextIndent = nextMatch ? nextMatch[1].length : 0;
      const nextIsDeeperNested = nextIndent > indentLevel;

      // Close any lists deeper than current indentation
      if (listStack.length > 0 && listStack[listStack.length - 1].indent > indentLevel) {
        closeListsToIndent(indentLevel + 1);
      }

      // Check if we need to open a new list at this level
      const currentListAtLevel = listStack.find(l => l.indent === indentLevel);
      if (!currentListAtLevel) {
        // Open new list
        const listTag = listType === '1' ? (parseInt(number) === 1 ? '<ol>' : `<ol start="${number}">`) :
                        listType === 'a' ? '<ol type="a">' :
                        '<ol type="i">';
        result.push(listTag);
        listStack.push({ indent: indentLevel, type: 'ol', listType });
      }

      // Add the list item
      if (nextIsDeeperNested) {
        // Don't close this <li> yet - nested items will go inside
        result.push(`<li>${content}`);
        pendingListItem = content;
      } else {
        result.push(`<li>${content}</li>`);
      }

      continue;
    }

    // Check for unordered list items (e.g., "* Item")
    const bulletMatch = line.match(/^(\s*)\*\s+(.+)$/);
    if (bulletMatch) {
      const indent = bulletMatch[1];
      const content = bulletMatch[2];
      const isSublist = indent.length >= 4;

      // Close any pending ordered list item
      if (pendingListItem !== null) {
        result.push('</li>');
        pendingListItem = null;
      }

      if (isSublist) {
        const prevLine = i - 1 >= 0 ? lines[i - 1] : '';
        const prevWasSublist = /^(\s+)\*\s+/.test(prevLine) && prevLine.match(/^(\s+)/)?.[1].length >= 4;
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const nextIsSublist = /^(\s+)\*\s+/.test(nextLine) && nextLine.match(/^(\s+)/)?.[1].length >= 4;

        if (!prevWasSublist) {
          result.push('<ul>');
        }
        result.push(`<li>${content}</li>`);
        if (!nextIsSublist) {
          result.push('</ul>');
          result.push('</li>');
        }
      } else {
        if (inOrderedList) {
          result.push('</ol>');
          inOrderedList = false;
          currentListStart = null;
        }
        if (!inUnorderedList) {
          result.push('<ul>');
          inUnorderedList = true;
        }

        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const nextIsSublist = /^(\s+)\*\s+/.test(nextLine) && nextLine.match(/^(\s+)/)?.[1].length >= 4;

        if (nextIsSublist) {
          result.push(`<li>${content}`);
        } else {
          result.push(`<li>${content}</li>`);
        }
      }
      continue;
    }

    // Not a list item - close any open lists
    if (pendingListItem !== null) {
      result.push('</li>');
      pendingListItem = null;
    }
    // Close all open lists from the stack
    while (listStack.length > 0) {
      listStack.pop();
      result.push('</ol>');
    }
    if (inOrderedList) {
      inOrderedList = false;
      currentListStart = null;
    }
    if (inUnorderedList) {
      result.push('</ul>');
      inUnorderedList = false;
    }

    // Clean up image tags
    line = line.replace(/&lt;img&gt;(.+?)&lt;\/img&gt;/g, '');

    // Convert to paragraph if not empty and not already HTML
    if (line.trim() && !line.trim().startsWith('<')) {
      result.push(`<p>${line}</p>`);
    } else if (line.trim()) {
      result.push(line);
    }
  }

  // Close any remaining open items/lists
  if (pendingListItem !== null) result.push('</li>');
  while (listStack.length > 0) {
    listStack.pop();
    result.push('</ol>');
  }
  if (inOrderedList) result.push('</ol>');
  if (inUnorderedList) result.push('</ul>');

  return result.join('\n');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/#+\s+/g, '')
    .replace(/<[^>]+>/g, '');
}

/**
 * Converts protocol references like "Blue 6" or "Gold 1" to clickable links
 * Preserves content inside <mermaid> tags without modification
 */
function linkProtocolReferences(html: string, refMap: Map<string, string>): string {
  // Extract mermaid blocks to preserve them
  const mermaidBlocks: string[] = [];
  const mermaidPlaceholder = '___MERMAID_BLOCK___';

  // Replace mermaid blocks with placeholders
  let processedHtml = html.replace(/<mermaid>[\s\S]*?<\/mermaid>/g, (match) => {
    mermaidBlocks.push(match);
    return `${mermaidPlaceholder}${mermaidBlocks.length - 1}${mermaidPlaceholder}`;
  });

  // Remove page_number tags and their content
  processedHtml = processedHtml.replace(/&lt;page_number&gt;.*?&lt;\/page_number&gt;/gi, '');

  // Convert img tags to icon markers for React component rendering
  // Pattern: <img>description</img> -> <protocol-icon name="description"></protocol-icon>
  processedHtml = processedHtml.replace(/&lt;img&gt;([^&]+)&lt;\/img&gt;/gi, (match, description) => {
    // Skip complex diagrams and charts - these should stay as text descriptions
    if (
      description.includes('Diagram') ||
      description.includes('ECG') ||
      description.includes('Scale') ||
      description.includes('Rule of') ||
      description.includes('Electrocardiogram') ||
      description.includes('MAINE EMS logo') ||
      description.includes('Department') ||
      description.includes('seal') ||
      description.includes('DONATE LIFE') ||
      description.includes('figure outline') ||
      description.includes('lead placement') ||
      description.includes('strips showing') ||
      description.includes('defibrillator pads') ||
      description.includes('car seat') ||
      description.includes('car bed') ||
      description.includes('harness device') ||
      description.includes('Valsalva') ||
      description.includes('lying down') ||
      description.includes('blowing into') ||
      description.includes('assisting patient') ||
      description.includes('Procedure') ||
      description.includes('Square') ||
      description.match(/^[A-Z]$/) || // Single letters
      description.match(/^feather$/) // feather
    ) {
      // Return as bracketed text for complex items
      return `<span class="text-xs italic text-gray-500 dark:text-gray-400">[${description}]</span>`;
    }
    // Convert to icon marker
    return `<protocol-icon name="${description}"></protocol-icon>`;
  });

  // Pattern to match protocol references: Color followed by number(s)
  // Matches: "Blue 6", "Gold 1", "Red 10-12", etc.
  const refPattern = /\b(Brown|Purple|Blue|Red|Gold|Green|Yellow|Lavender|Pink|Orange|Grey)\s+(\d+)(?:\s*-\s*(\d+))?\b/gi;

  processedHtml = processedHtml.replace(refPattern, (match, color, startNum, endNum) => {
    const colorLower = color.toLowerCase();
    const pageNum = parseInt(startNum);
    const refKey = `${colorLower}_${pageNum}`;
    const protocolId = refMap.get(refKey);

    if (protocolId) {
      // Create a link to the protocol
      return `<a href="/protocol/${protocolId}" class="protocol-ref-link">${match}</a>`;
    }

    // If no protocol found, return the original text
    return match;
  });

  // Restore mermaid blocks
  processedHtml = processedHtml.replace(/___MERMAID_BLOCK___(\d+)___MERMAID_BLOCK___/g, (match, index) => {
    return mermaidBlocks[parseInt(index)];
  });

  return processedHtml;
}
