#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
type ProviderLevel = 'EMT' | 'ADVANCED_EMT' | 'PARAMEDIC' | 'ALL' | 'EMT_ADVANCED_EMT' | 'ADVANCED_EMT_PARAMEDIC' | 'EMT_ADVANCED_EMT_PARAMEDIC' | 'PEARLS';

interface Category {
  id: string;
  name: string;
  displayName: string;
  color: string;
  protocols: ProtocolReference[];
}

interface ProtocolReference {
  id: string;
  title: string;
  pages: PageReference[];
}

interface PageReference {
  pageId: string;
  htmlFile: string;
  jpgFile: string;
  jpgPageNumber: number;
  protocolPageNumber: string;
}

// Internal parser types (not exported to JSON)
interface InternalProtocolPage {
  pageId: string;
  pageNumber: string;
  jpgReference: string;
  isContinuation: boolean;
  sections: ProtocolSection[];
}

interface ProtocolSection {
  type: 'header' | 'content' | 'list' | 'table' | 'mermaid' | 'pearls';
  providerLevel: ProviderLevel;
  content: any;
  html: string;
  pearlsTitle?: string;
}

interface ListData {
  type: 'ordered' | 'unordered';
  startNumber?: number;
  items: ListItem[];
}

interface ListItem {
  content: string;
  nestedList?: ListData;
}

interface TableData {
  type: 'table';
  headers: string[];
  rows: string[][];
}

interface MermaidDiagram {
  type: 'mermaid';
  code: string;
}

// Output protocol types (matches src/types/protocol.ts)
interface ProtocolStep {
  num: number;
  providerLevel: ProviderLevel;
  html: string;
}

interface ProtocolIntroItem {
  type: 'content' | 'mermaid' | 'table' | 'list';
  providerLevel: ProviderLevel;
  html: string;
}

interface ProtocolPearl {
  title?: string;
  html: string[];
}

interface Protocol {
  id: string;
  title: string;
  category: string;
  intro: ProtocolIntroItem[];
  steps: ProtocolStep[];
  pearls: ProtocolPearl[];
  pages: Array<{ pageId: string; pageNumber: string; jpgReference: string }>;
}

interface SearchIndex {
  id: string;
  category: string;
  title: string;
  content: string;
  providerLevels: string[];
  keywords: string[];
}

interface TableOfContents {
  categories: Category[];
}

// Constants
const SOURCE_DIR = path.join(__dirname, '..', 'archive-html-files');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'data');
const PROTOCOLS_DIR = path.join(OUTPUT_DIR, 'protocols');

const CATEGORY_COLORS: Record<string, string> = {
  brown: '#8B4513',
  purple: '#800080',
  blue: '#0066CC',
  red: '#DC143C',
  gold: '#FFB800',
  green: '#00AA00',
  yellow: '#FFD700',
  lavender: '#9966CC',
  pink: '#FF69B4',
  orange: '#FF8800',
  grey: '#808080'
};

// Helper: Extract color ID from category text
function extractColorId(categoryText: string): string {
  // Try "Color - Name" format first (e.g., "Blue - Respiratory")
  let match = categoryText.match(/^(Brown|Purple|Blue|Red|Gold|Green|Yellow|Lavender|Pink|Orange|Grey)/i);
  if (match) return match[1].toLowerCase();

  // Try "Name - Color" format (e.g., "General medical - Gold")
  match = categoryText.match(/\s*-\s*(Brown|Purple|Blue|Red|Gold|Green|Yellow|Lavender|Pink|Orange|Grey)\s*$/i);
  return match ? match[1].toLowerCase() : '';
}

// Helper: Extract category name from text
function extractCategoryName(categoryText: string): string {
  // For "Color - Name" format
  let match = categoryText.match(/^\w+\s*-\s*(.+)/);
  if (match) return match[1].trim();

  // For "Name - Color" format
  match = categoryText.match(/^(.+?)\s*-\s*\w+$/);
  return match ? match[1].trim() : categoryText;
}

// Helper: Extract JPG page number from href
function extractJpgPageNumber(href: string): number {
  const match = href.match(/(\d+)\.jpg$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Helper: Extract protocol page number from page_number tag
function extractProtocolPageNumber(html: string): string {
  // Match both HTML-encoded and raw versions
  const match = html.match(/(?:&lt;|<)page_number(?:&gt;|>)(.*?)(?:&lt;|<)\/page_number(?:&gt;|>)/);
  return match ? match[1].trim() : '';
}

// Helper: Detect provider level from text
function extractProviderLevel(text: string): ProviderLevel {
  const upperText = text.toUpperCase();

  // Normalize: treat AEMT as ADVANCED EMT, strip spaces around slashes
  const normalized = upperText.replace(/\bAEMT\b/g, 'ADVANCED EMT').replace(/\s*\/\s*/g, '/');

  const hasParamedic = normalized.includes('PARAMEDIC');
  const hasAdvancedEmt = normalized.includes('ADVANCED EMT');
  // EMT alone: present in string but not as part of ADVANCED EMT
  const hasEmt = /\bEMT\b/.test(normalized.replace(/ADVANCED EMT/g, ''));

  if (upperText.includes('ALL CLINICIANS')) return 'ALL';
  if (/\bPEARLS?\b/i.test(text)) return 'PEARLS';

  if (hasEmt && hasAdvancedEmt && hasParamedic) return 'EMT_ADVANCED_EMT_PARAMEDIC';
  if (hasEmt && hasAdvancedEmt) return 'EMT_ADVANCED_EMT';
  if (hasAdvancedEmt && hasParamedic) return 'ADVANCED_EMT_PARAMEDIC';
  if (hasParamedic && !hasEmt && !hasAdvancedEmt) return 'PARAMEDIC';
  if (hasAdvancedEmt && !hasEmt && !hasParamedic) return 'ADVANCED_EMT';
  if (hasEmt && !hasAdvancedEmt && !hasParamedic) return 'EMT';

  return 'ALL';
}

// Parse table of contents
function parseTableOfContents(htmlContent: string): TableOfContents {
  console.log('Parsing table of contents...');

  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const categories: Category[] = [];

  // Find all category list items (first level ul > li)
  const categoryLis = document.querySelectorAll('body > ul > li');

  console.log(`Found ${categoryLis.length} category <li> elements`);

  categoryLis.forEach(categoryLi => {
    const strongElement = categoryLi.querySelector('strong');
    if (!strongElement) {
      console.log('  Skipping: no <strong> element');
      return;
    }

    const categoryText = strongElement.textContent || '';
    const colorId = extractColorId(categoryText);
    const categoryName = extractCategoryName(categoryText);

    console.log(`  Processing: "${categoryText}" -> colorId="${colorId}", name="${categoryName}"`);

    if (!colorId) {
      console.log(`  Skipping: no color ID extracted from "${categoryText}"`);
      return;
    }

    const category: Category = {
      id: colorId,
      name: categoryName,
      displayName: categoryText,
      color: CATEGORY_COLORS[colorId] || '#000000',
      protocols: []
    };

    // Find all protocol list items (nested ul > li)
    const protocolLis = categoryLi.querySelectorAll('ul > li');
    const protocolMap = new Map<string, ProtocolReference>();

    protocolLis.forEach(protocolLi => {
      const text = protocolLi.textContent || '';
      const links = protocolLi.querySelectorAll('a');

      if (links.length < 2) return; // Need both protocol link and JPG link

      const protocolLink = links[0];
      const jpgLink = links[1];

      const htmlFile = protocolLink.getAttribute('href') || '';
      let jpgFile = jpgLink.getAttribute('href') || '';

      // Fix JPG path: convert /src/assets/pages_jpg/XXX.jpg to /page_jpg/XXX.jpg
      if (jpgFile.includes('/src/assets/pages_jpg/')) {
        jpgFile = jpgFile.replace('/src/assets/pages_jpg/', '/page_jpg/');
      }

      const protocolPageNumber = protocolLink.textContent || '';

      // Extract protocol title (everything before the first comma)
      const titleMatch = text.match(/^([^,]+),/);
      const title = titleMatch ? titleMatch[1].trim() : text.trim();

      // Get or create protocol reference
      if (!protocolMap.has(title)) {
        protocolMap.set(title, {
          id: '',
          title,
          pages: []
        });
      }

      const protocol = protocolMap.get(title)!;

      // Extract page ID from HTML filename
      const pageIdMatch = htmlFile.match(/([^/]+)\.html$/);
      const pageId = pageIdMatch ? pageIdMatch[1] : '';

      protocol.pages.push({
        pageId,
        htmlFile,
        jpgFile,
        jpgPageNumber: extractJpgPageNumber(jpgFile),
        protocolPageNumber
      });
    });

    // Convert map to array and set protocol IDs
    protocolMap.forEach((protocol, title) => {
      // Use first page ID as base, add all page numbers if multi-page
      if (protocol.pages.length > 0) {
        const pageIds = protocol.pages.map(p => p.pageId).join('_');
        protocol.id = pageIds;
        category.protocols.push(protocol);
      }
    });

    categories.push(category);
  });

  return { categories };
}

// Parse list data from HTML element
function parseListData(element: Element): ListData {
  const isOrdered = element.tagName.toLowerCase() === 'ol';
  const startAttr = element.getAttribute('start');
  const startNumber = startAttr ? parseInt(startAttr, 10) : 1;

  const items: ListItem[] = [];
  const listItems = element.querySelectorAll(':scope > li');

  listItems.forEach(li => {
    const nestedList = li.querySelector('ol, ul');
    let content = '';

    // Get text content without nested list
    if (nestedList) {
      const clone = li.cloneNode(true) as Element;
      const nestedInClone = clone.querySelector('ol, ul');
      if (nestedInClone) {
        nestedInClone.remove();
      }
      content = clone.textContent || '';
    } else {
      content = li.textContent || '';
    }

    items.push({
      content: content.trim(),
      nestedList: nestedList ? parseListData(nestedList) : undefined
    });
  });

  return {
    type: isOrdered ? 'ordered' : 'unordered',
    startNumber: isOrdered ? startNumber : undefined,
    items
  };
}

// Parse table data from HTML element
function parseTableData(element: Element): TableData {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers
  const headerCells = element.querySelectorAll('thead th, thead td');
  headerCells.forEach(cell => {
    headers.push(cell.textContent?.trim() || '');
  });

  // Extract rows
  const bodyRows = element.querySelectorAll('tbody tr');
  bodyRows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    const rowData: string[] = [];
    cells.forEach(cell => {
      rowData.push(cell.textContent?.trim() || '');
    });
    if (rowData.length > 0) {
      rows.push(rowData);
    }
  });

  return {
    type: 'table',
    headers,
    rows
  };
}

// Parse individual protocol HTML file
function parseProtocolHTML(htmlPath: string, pageId: string, jpgFile?: string, pageIndex = 0, inheritedProviderLevel: ProviderLevel = 'ALL'): InternalProtocolPage | null {
  if (!existsSync(htmlPath)) {
    console.warn(`  File not found: ${htmlPath}`);
    return null;
  }

  const htmlContent = readFileSync(htmlPath, 'utf-8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const sections: ProtocolSection[] = [];
  // Continuation pages inherit the last provider level from the previous page
  let currentProviderLevel: ProviderLevel = inheritedProviderLevel;

  // A continuation page is any page after the first in a multi-page protocol
  const isContinuation = pageIndex > 0;

  // Extract page number
  const pageNumber = extractProtocolPageNumber(htmlContent);

  // Use provided jpgFile or try to extract from HTML
  let jpgReference = jpgFile || '';
  if (!jpgReference) {
    const links = document.querySelectorAll('a[href*="jpg"]');
    if (links.length > 0) {
      const lastLink = links[links.length - 1];
      jpgReference = lastLink.getAttribute('href') || '';
    }
  }

  // Process all body children
  const bodyChildren = document.body.childNodes;

  bodyChildren.forEach(node => {
    if (node.nodeType !== 1) return; // Only process element nodes

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    // Detect provider level headers
    if (tagName === 'h2') {
      const text = element.textContent || '';
      currentProviderLevel = extractProviderLevel(text);

      // Extract pearlsTitle from "PEARLS for X" or "PEARLS FOR X"
      const pearlsMatch = text.match(/^PEARLS\s+(?:FOR\s+)?(.+)/i);
      const section: ProtocolSection = {
        type: 'header',
        providerLevel: currentProviderLevel,
        content: text,
        html: element.outerHTML
      };
      if (pearlsMatch) section.pearlsTitle = pearlsMatch[1].trim();

      sections.push(section);
      return;
    }

    // Detect H1 title — skip on continuation pages (it's just "Protocol Name #N")
    if (tagName === 'h1') {
      if (!isContinuation) {
        sections.push({
          type: 'header',
          providerLevel: 'ALL',
          content: element.textContent || '',
          html: element.outerHTML
        });
      }
      return;
    }

    // Detect Mermaid diagrams
    if (tagName === 'mermaid') {
      sections.push({
        type: 'mermaid',
        providerLevel: currentProviderLevel,
        content: {
          type: 'mermaid',
          code: element.textContent || ''
        } as MermaidDiagram,
        html: element.outerHTML
      });
      return;
    }

    // Detect tables
    if (tagName === 'table') {
      sections.push({
        type: 'table',
        providerLevel: currentProviderLevel,
        content: parseTableData(element),
        html: element.outerHTML
      });
      return;
    }

    // Detect lists
    if (tagName === 'ol' || tagName === 'ul') {
      sections.push({
        type: 'list',
        providerLevel: currentProviderLevel,
        content: parseListData(element),
        html: element.outerHTML
      });
      return;
    }

    // Detect PEARLS sections (standalone <p> containing PEARLS title text)
    if (tagName === 'p' && element.outerHTML.includes('PEARLS')) {
      sections.push({
        type: 'pearls',
        providerLevel: currentProviderLevel,
        content: element.textContent || '',
        html: element.outerHTML
      });
      return;
    }

    // Regular content paragraphs
    if (tagName === 'p') {
      const text = element.textContent || '';

      // Check if this paragraph is a provider level header (e.g., <p><strong>EMT</strong></p>)
      const firstChild = element.firstElementChild;
      if (firstChild && firstChild.tagName.toLowerCase() === 'strong') {
        const strongText = firstChild.textContent?.trim() || '';
        const detectedLevel = extractProviderLevel(strongText);

        // If the strong tag ONLY contains provider level text (no extra content after)
        // then treat this as a provider level header
        // Match single or combined provider level headers (e.g. "EMT", "EMT/ADVANCED EMT/PARAMEDIC", "EMT/AEMT/PARAMEDIC")
        const providerToken = /^(EMT|ADVANCED\s+EMT|AEMT|PARAMEDIC)(\s*\/\s*(EMT|ADVANCED\s+EMT|AEMT|PARAMEDIC))*:?$/i;
        if (detectedLevel !== 'ALL' && strongText.match(providerToken)) {
          currentProviderLevel = detectedLevel;
          const headerLabel = strongText.replace(/:$/, ''); // strip trailing colon

          // Create header section with just the provider level text
          sections.push({
            type: 'header',
            providerLevel: currentProviderLevel,
            content: headerLabel,
            html: `<h2>${headerLabel}</h2>` // Simple header HTML without the extra content
          });

          // Check if there's additional content after the <strong> tag
          // If so, create a separate content section for it
          const remainingText = text.substring(strongText.length).trim();
          if (remainingText) {
            // Remove the <strong> tag from the HTML and keep the rest
            const contentHtml = element.innerHTML.replace(/<strong>[^<]+<\/strong>\s*(<br\s*\/?>\s*)?/i, '');
            if (contentHtml.trim()) {
              sections.push({
                type: 'content',
                providerLevel: currentProviderLevel,
                content: remainingText,
                html: `<p>${contentHtml}</p>`
              });
            }
          }
          return;
        }
      }

      // Skip empty paragraphs and footer links
      if (text.trim() && !text.includes('Back to TOC') && !text.startsWith('(Back to TOC)')) {
        sections.push({
          type: 'content',
          providerLevel: currentProviderLevel,
          content: text,
          html: element.outerHTML
        });
      }
      return;
    }
  });

  return {
    pageId,
    pageNumber,
    jpgReference,
    isContinuation,
    sections
  };
}

// Parse <br>-separated numbered steps from a content section's HTML
// Handles patterns like: <p>7. Establish IV en route.<br>8. If shock present...</p>
// Returns steps array if content looks like numbered steps, null otherwise
function parseBreakSeparatedSteps(html: string, providerLevel: ProviderLevel): ProtocolStep[] | null {
  const dom = new JSDOM(html);
  const p = dom.window.document.querySelector('p');
  if (!p) return null;

  const innerHTML = p.innerHTML;
  const segments = innerHTML.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  // Check if the first segment starts with a numbered step pattern
  const firstText = segments[0].replace(/<[^>]+>/g, '').trim();
  if (!/^\d+\./.test(firstText)) return null;

  const result: ProtocolStep[] = [];
  let currentNum = -1;
  let currentParts: string[] = [];

  for (const segment of segments) {
    const textContent = segment.replace(/<[^>]+>/g, '').trim();
    const match = textContent.match(/^(\d+)\.\s*/);

    if (match) {
      if (currentNum > 0 && currentParts.length > 0) {
        result.push({ num: currentNum, providerLevel, html: currentParts.join('<br>') });
      }
      currentNum = parseInt(match[1], 10);
      // Strip the "N. " prefix from the raw segment text (safe because it's plain text at start)
      const htmlWithoutPrefix = segment.replace(/^\d+\.\s*/, '');
      currentParts = [htmlWithoutPrefix];
    } else if (currentNum > 0) {
      currentParts.push(segment);
    }
  }

  if (currentNum > 0 && currentParts.length > 0) {
    result.push({ num: currentNum, providerLevel, html: currentParts.join('<br>') });
  }

  return result.length > 0 ? result : null;
}

// Build unified protocol from internal pages-with-sections structure
function buildUnifiedProtocol(
  id: string,
  title: string,
  category: string,
  rawPages: InternalProtocolPage[]
): Protocol {
  const intro: ProtocolIntroItem[] = [];
  const steps: ProtocolStep[] = [];
  const pearls: ProtocolPearl[] = [];
  let currentPearl: { title?: string; html: string[] } | null = null;
  let inPearls = false;

  for (const page of rawPages) {
    for (const section of page.sections) {
      // Headers control provider level context — handled at parse time via inheritance
      // PEARLS headers start a PEARLS section
      if (section.type === 'header') {
        if (section.providerLevel === 'PEARLS') {
          inPearls = true;
          currentPearl = { title: section.pearlsTitle, html: [] };
          pearls.push(currentPearl);
        } else {
          inPearls = false;
        }
        continue;
      }

      // Everything after a PEARLS header goes into that pearl section
      if (inPearls && currentPearl) {
        currentPearl.html.push(section.html);
        continue;
      }

      // Ordered lists → extract individual <li> items as steps
      if (section.type === 'list' && section.html.trimStart().startsWith('<ol')) {
        const dom = new JSDOM(section.html);
        const ol = dom.window.document.querySelector('ol');
        if (ol) {
          const startAttr = ol.getAttribute('start');
          const lastNum = steps.length > 0 ? steps[steps.length - 1].num : 0;
          let num = startAttr ? parseInt(startAttr, 10) : lastNum + 1;
          const lis = ol.querySelectorAll(':scope > li');
          lis.forEach(li => {
            steps.push({
              num,
              providerLevel: section.providerLevel,
              html: li.innerHTML,
            });
            num++;
          });
        }
        continue;
      }

      // Content sections may contain <br>-separated numbered steps (PDF artifact)
      // e.g. <p><strong>ADVANCED EMT</strong><br>7. Establish IV...<br>8. Cardiac monitor...</p>
      if (section.type === 'content') {
        const brSteps = parseBreakSeparatedSteps(section.html, section.providerLevel);
        if (brSteps && brSteps.length > 0) {
          steps.push(...brSteps);
          continue;
        }
      }

      // Everything else (ul lists, content, mermaid, table) → intro
      intro.push({
        type: section.type === 'list' ? 'list' : section.type as 'content' | 'mermaid' | 'table',
        providerLevel: section.providerLevel,
        html: section.html,
      });
    }
  }

  const pageRefs = rawPages.map(p => ({
    pageId: p.pageId,
    pageNumber: p.pageNumber,
    jpgReference: p.jpgReference,
  }));

  return { id, title, category, intro, steps, pearls, pages: pageRefs };
}

// Build search index
function buildSearchIndex(allProtocols: Protocol[]): SearchIndex[] {
  console.log('Building search index...');

  const searchIndex: SearchIndex[] = [];

  allProtocols.forEach(protocol => {
    const content: string[] = [];
    const providerLevels = new Set<string>();

    // Collect content from intro items
    protocol.intro.forEach(item => {
      if (item.providerLevel !== 'ALL') {
        providerLevels.add(item.providerLevel);
      }
      // Strip HTML tags for search content
      content.push(item.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    });

    // Collect content from steps
    protocol.steps.forEach(step => {
      if (step.providerLevel !== 'ALL') {
        providerLevels.add(step.providerLevel);
      }
      content.push(step.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    });

    // Collect content from pearls
    protocol.pearls.forEach(pearl => {
      pearl.html.forEach(h => {
        content.push(h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      });
    });

    // Extract medical keywords (simple approach)
    const allText = content.join(' ').toLowerCase();
    const keywords: string[] = [];

    // Common medical terms to index
    const medicalTerms = [
      'airway', 'breathing', 'circulation', 'cardiac', 'respiratory',
      'trauma', 'shock', 'anaphylaxis', 'stroke', 'seizure',
      'intubation', 'epinephrine', 'oxygen', 'cpap', 'ventilation',
      'hemorrhage', 'burn', 'overdose', 'poisoning'
    ];

    medicalTerms.forEach(term => {
      if (allText.includes(term)) {
        keywords.push(term);
      }
    });

    searchIndex.push({
      id: protocol.id,
      category: protocol.category,
      title: protocol.title,
      content: content.join(' ').substring(0, 500), // Limit length
      providerLevels: Array.from(providerLevels),
      keywords
    });
  });

  return searchIndex;
}

// Main parsing function
async function parseAllProtocols() {
  console.log('='.repeat(50));
  console.log('Maine EMS Protocols Parser');
  console.log('='.repeat(50));
  console.log('');

  // Ensure output directories exist
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!existsSync(PROTOCOLS_DIR)) {
    mkdirSync(PROTOCOLS_DIR, { recursive: true });
  }

  // Parse table of contents
  const contentsPath = path.join(SOURCE_DIR, 'contents.html');
  if (!existsSync(contentsPath)) {
    console.error(`ERROR: contents.html not found at ${contentsPath}`);
    process.exit(1);
  }

  const tocHtml = readFileSync(contentsPath, 'utf-8');
  const toc = parseTableOfContents(tocHtml);

  console.log(`Found ${toc.categories.length} categories`);
  console.log('');

  // Parse protocols by category
  const allProtocols: Protocol[] = [];
  const protocolsByCategory: Record<string, Protocol[]> = {};

  for (const category of toc.categories) {
    console.log(`Processing category: ${category.displayName}`);
    protocolsByCategory[category.id] = [];

    for (const protocolRef of category.protocols) {
      console.log(`  Protocol: ${protocolRef.title} (${protocolRef.pages.length} pages)`);

      const rawPages: InternalProtocolPage[] = [];
      let trailingProviderLevel: ProviderLevel = 'ALL';

      for (let pageIdx = 0; pageIdx < protocolRef.pages.length; pageIdx++) {
        const pageRef = protocolRef.pages[pageIdx];
        const htmlPath = path.join(SOURCE_DIR, pageRef.htmlFile);
        const page = parseProtocolHTML(htmlPath, pageRef.pageId, pageRef.jpgFile, pageIdx, trailingProviderLevel);

        if (page) {
          rawPages.push(page);
          // Track last meaningful provider level for the next page to inherit
          for (let i = page.sections.length - 1; i >= 0; i--) {
            const lvl = page.sections[i].providerLevel;
            if (lvl !== 'ALL' && lvl !== 'PEARLS') {
              trailingProviderLevel = lvl;
              break;
            }
          }
        }
      }

      if (rawPages.length > 0) {
        const protocol = buildUnifiedProtocol(protocolRef.id, protocolRef.title, category.id, rawPages);

        protocolsByCategory[category.id].push(protocol);
        allProtocols.push(protocol);
      }
    }

    console.log('');
  }

  // Write TOC
  console.log('Writing table of contents...');
  writeFileSync(
    path.join(OUTPUT_DIR, 'toc.json'),
    JSON.stringify(toc, null, 2),
    'utf-8'
  );

  // Write protocols by category
  console.log('Writing protocol files...');
  for (const [categoryId, protocols] of Object.entries(protocolsByCategory)) {
    writeFileSync(
      path.join(PROTOCOLS_DIR, `${categoryId}.json`),
      JSON.stringify(protocols, null, 2),
      'utf-8'
    );
    console.log(`  ${categoryId}.json: ${protocols.length} protocols`);
  }

  // Build and write search index
  const searchIndex = buildSearchIndex(allProtocols);
  writeFileSync(
    path.join(OUTPUT_DIR, 'search-index.json'),
    JSON.stringify(searchIndex, null, 2),
    'utf-8'
  );
  console.log(`  search-index.json: ${searchIndex.length} entries`);

  // Write metadata
  const totalPages = allProtocols.reduce((sum, p) => sum + p.pages.length, 0);
  const metadata = {
    buildDate: new Date().toISOString(),
    version: '1.0.0',
    totalProtocols: allProtocols.length,
    totalPages,
    categories: toc.categories.length
  };

  writeFileSync(
    path.join(OUTPUT_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log('');
  console.log('='.repeat(50));
  console.log('Parsing complete!');
  console.log('='.repeat(50));
  console.log(`Total protocols: ${metadata.totalProtocols}`);
  console.log(`Total pages: ${metadata.totalPages}`);
  console.log(`Categories: ${metadata.categories}`);
  console.log('');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');
}

// Run the parser
parseAllProtocols().catch(error => {
  console.error('ERROR:', error);
  process.exit(1);
});
