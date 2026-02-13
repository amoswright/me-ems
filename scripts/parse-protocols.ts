#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
type ProviderLevel = 'EMT' | 'ADVANCED_EMT' | 'PARAMEDIC' | 'ALL';

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

interface Protocol {
  id: string;
  title: string;
  category: string;
  pages: ProtocolPage[];
}

interface ProtocolPage {
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
const SOURCE_DIR = path.join(__dirname, '..', '..', 'archive-html-files');
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
  const match = html.match(/<page_number>(.*?)<\/page_number>/);
  return match ? match[1].trim() : '';
}

// Helper: Detect provider level from text
function extractProviderLevel(text: string): ProviderLevel {
  const upperText = text.toUpperCase();

  if (upperText.includes('PARAMEDIC') && !upperText.includes('EMT') && !upperText.includes('ADVANCED')) {
    return 'PARAMEDIC';
  }
  if (upperText.includes('ADVANCED EMT') || upperText.includes('AEMT')) {
    return 'ADVANCED_EMT';
  }
  if (upperText.includes('EMT') && !upperText.includes('ADVANCED') && !upperText.includes('PARAMEDIC')) {
    return 'EMT';
  }
  if (upperText.includes('EMT/ADVANCED EMT/PARAMEDIC') || upperText.includes('ALL CLINICIANS')) {
    return 'ALL';
  }

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
      const jpgFile = jpgLink.getAttribute('href') || '';
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
function parseProtocolHTML(htmlPath: string, pageId: string): ProtocolPage | null {
  if (!existsSync(htmlPath)) {
    console.warn(`  File not found: ${htmlPath}`);
    return null;
  }

  const htmlContent = readFileSync(htmlPath, 'utf-8');
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  const sections: ProtocolSection[] = [];
  let currentProviderLevel: ProviderLevel = 'ALL';

  // Check if this is a continuation page
  const isContinuation = htmlContent.includes('(Continued from previous page)') ||
                         htmlContent.includes('(Continued)');

  // Extract page number
  const pageNumber = extractProtocolPageNumber(htmlContent);

  // Extract JPG reference from footer
  let jpgReference = '';
  const links = document.querySelectorAll('a[href*="jpg"]');
  if (links.length > 0) {
    const lastLink = links[links.length - 1];
    jpgReference = lastLink.getAttribute('href') || '';
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

      sections.push({
        type: 'header',
        providerLevel: currentProviderLevel,
        content: text,
        html: element.outerHTML
      });
      return;
    }

    // Detect H1 title
    if (tagName === 'h1') {
      sections.push({
        type: 'header',
        providerLevel: 'ALL',
        content: element.textContent || '',
        html: element.outerHTML
      });
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

    // Detect PEARLS sections
    if (tagName === 'p' && element.outerHTML.includes('PEARLS')) {
      sections.push({
        type: 'pearls',
        providerLevel: 'ALL',
        content: element.textContent || '',
        html: element.outerHTML
      });
      return;
    }

    // Regular content paragraphs
    if (tagName === 'p') {
      const text = element.textContent || '';
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

// Build search index
function buildSearchIndex(allProtocols: Protocol[]): SearchIndex[] {
  console.log('Building search index...');

  const searchIndex: SearchIndex[] = [];

  allProtocols.forEach(protocol => {
    const content: string[] = [];
    const providerLevels = new Set<string>();

    protocol.pages.forEach(page => {
      page.sections.forEach(section => {
        if (section.providerLevel !== 'ALL') {
          providerLevels.add(section.providerLevel);
        }

        if (typeof section.content === 'string') {
          content.push(section.content);
        } else if (section.content && typeof section.content === 'object') {
          // Extract text from complex content
          content.push(JSON.stringify(section.content));
        }
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

      const pages: ProtocolPage[] = [];

      for (const pageRef of protocolRef.pages) {
        const htmlPath = path.join(SOURCE_DIR, pageRef.htmlFile);
        const page = parseProtocolHTML(htmlPath, pageRef.pageId);

        if (page) {
          pages.push(page);
        }
      }

      if (pages.length > 0) {
        const protocol: Protocol = {
          id: protocolRef.id,
          title: protocolRef.title,
          category: category.id,
          pages
        };

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
  const metadata = {
    buildDate: new Date().toISOString(),
    version: '1.0.0',
    totalProtocols: allProtocols.length,
    totalPages: allProtocols.reduce((sum, p) => sum + p.pages.length, 0),
    categories: toc.categories.length
  };

  writeFileSync(
    path.join(OUTPUT_DIR, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );

  console.log('');
  console.log('='.repeat(50));
  console.log('✓ Parsing complete!');
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
