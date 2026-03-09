#!/usr/bin/env tsx
/**
 * fix-list-nesting.ts
 *
 * Transforms flat <br>a. / <br>i. / <br>1. inline sub-item patterns in archive
 * HTML files into properly nested semantic lists:
 *
 *   Top-level numbered steps   → <ol>          (unchanged, already correct)
 *   Letter sub-items (a. b.)   → <ol type="a">
 *   Roman sub-items (i. ii.)   → <ol type="i">
 *   Number sub-sub-items (1.2.)→ <ol>
 *
 * Also adds type attributes to any existing nested <ol> that are missing them.
 *
 * Reads from archive-html-files/, writes fixed HTML back in-place.
 * After running this, execute:  npm run parse
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVE_DIR = path.join(__dirname, '..', 'archive-html-files');

// ─── Marker detection ──────────────────────────────────────────────────────

// Roman numerals up to ~15 (enough for any EMS protocol sub-list)
const ROMAN_SET = new Set(['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv']);

type MarkerType = 'alpha' | 'roman' | 'number' | 'none';

interface MarkerMatch {
  type: MarkerType;
  marker: string;
  rest: string;
}

function detectMarker(text: string): MarkerMatch {
  const t = text.trimStart();

  // Number: "1. " or "1) "
  const numM = t.match(/^(\d+)[.)]\s+([\s\S]*)/);
  if (numM) return { type: 'number', marker: numM[1], rest: numM[2] };

  // Roman (must come before alpha since 'i', 'v', 'x' are also letters)
  const romM = t.match(/^([ivxlcdm]{1,6})[.)]\s+([\s\S]*)/i);
  if (romM && ROMAN_SET.has(romM[1].toLowerCase())) {
    return { type: 'roman', marker: romM[1].toLowerCase(), rest: romM[2] };
  }

  // Alpha: "a. " single letter
  const alpM = t.match(/^([a-z])[.)]\s+([\s\S]*)/i);
  if (alpM && alpM[1].length === 1) {
    return { type: 'alpha', marker: alpM[1].toLowerCase(), rest: alpM[2] };
  }

  return { type: 'none', marker: '', rest: text };
}

// ─── Core: transform a single <li>'s innerHTML ────────────────────────────

interface SubItem {
  markerType: MarkerType;
  content: string;           // may contain HTML
  children: SubItem[];
}

/**
 * Split a raw innerHTML on <br> tags and build a tree of SubItems.
 * Returns null if no sub-item markers are found (no change needed).
 */
function buildSubItemTree(innerHTML: string): { main: string; items: SubItem[] } | null {
  // Split on <br> (with optional space/newline after)
  const parts = innerHTML.split(/<br\s*\/?>\s*/gi);

  if (parts.length <= 1) return null;

  const main = parts[0];
  const rest = parts.slice(1).map(p => p.trim()).filter(p => p.length > 0);

  if (rest.length === 0) return null;

  // Check that at least one part has a marker
  const hasAnyMarker = rest.some(p => detectMarker(p).type !== 'none');
  if (!hasAnyMarker) return null;

  // Parse into a flat list first, then build tree
  interface FlatItem {
    depth: MarkerType;
    content: string;
  }

  const flat: FlatItem[] = [];
  for (const part of rest) {
    const m = detectMarker(part);
    if (m.type !== 'none') {
      flat.push({ depth: m.type, content: m.rest });
    } else {
      // Continuation text (e.g., "-OR-", wrapping lines) — append to last item
      if (flat.length > 0) {
        flat[flat.length - 1].content += ' ' + part;
      } else {
        // Belongs to main content
        return null; // can't cleanly parse; leave as-is
      }
    }
  }

  if (flat.length === 0) return null;

  // Build nested tree: alpha → roman → number
  const DEPTH_ORDER: MarkerType[] = ['alpha', 'roman', 'number'];

  function buildTree(items: FlatItem[], allowedDepths: MarkerType[]): SubItem[] {
    if (items.length === 0 || allowedDepths.length === 0) return [];

    const currentDepth = allowedDepths[0];
    const childDepths = allowedDepths.slice(1);
    const result: SubItem[] = [];
    let current: SubItem | null = null;
    const pendingChildren: FlatItem[] = [];

    const flush = () => {
      if (current && pendingChildren.length > 0) {
        current.children = buildTree([...pendingChildren], childDepths);
        pendingChildren.length = 0;
      }
    };

    for (const item of items) {
      if (item.depth === currentDepth) {
        flush();
        if (current) result.push(current);
        current = { markerType: item.depth, content: item.content, children: [] };
      } else if (childDepths.includes(item.depth)) {
        pendingChildren.push(item);
      } else {
        // Unexpected depth — append to current or start new
        if (current) {
          current.content += ' ' + item.content;
        } else {
          current = { markerType: item.depth, content: item.content, children: [] };
        }
      }
    }
    flush();
    if (current) result.push(current);
    return result;
  }

  // Determine top-level marker type from first marked item
  const firstMarkerType = flat[0].depth;
  const startIdx = DEPTH_ORDER.indexOf(firstMarkerType);
  const allowedDepths = startIdx >= 0 ? DEPTH_ORDER.slice(startIdx) : DEPTH_ORDER;

  const items = buildTree(flat, allowedDepths);
  return { main, items };
}

function olTypeForDepth(markerType: MarkerType): string {
  if (markerType === 'alpha') return ' type="a"';
  if (markerType === 'roman') return ' type="i"';
  return ''; // number → default numbered
}

function renderSubItems(items: SubItem[]): string {
  if (items.length === 0) return '';
  const type = olTypeForDepth(items[0].markerType);
  let html = `\n<ol${type}>\n`;
  for (const item of items) {
    html += `<li>${item.content}`;
    if (item.children.length > 0) {
      html += renderSubItems(item.children);
    }
    html += `</li>\n`;
  }
  html += `</ol>`;
  return html;
}

/**
 * Transform one <li> element in-place.
 * Returns true if the element was modified.
 */
function transformLi(li: Element): boolean {
  const originalHtml = li.innerHTML;

  // Skip if the <li> already contains a nested <ol> or <ul>
  // (those were already properly nested in the source)
  if (li.querySelector('ol, ul')) {
    // Just ensure existing nested lists have the right type attributes
    fixNestedOlTypes(li);
    return false;
  }

  const tree = buildSubItemTree(originalHtml);
  if (!tree) return false;

  li.innerHTML = tree.main + renderSubItems(tree.items);
  return true;
}

/**
 * Add type="a" / type="i" to existing nested <ol> elements that lack a type.
 * Determines type by looking at the first <li>'s text content for markers.
 */
function fixNestedOlTypes(root: Element): void {
  // Find all <ol> that are children of <li> elements (i.e., nested lists)
  const nestedOls = root.querySelectorAll('li > ol');
  nestedOls.forEach(ol => {
    if (ol.getAttribute('type')) return; // already has type

    // Detect type from first li's text
    const firstLi = ol.querySelector(':scope > li');
    if (!firstLi) return;
    const text = firstLi.textContent?.trimStart() || '';

    // If first li text starts with a letter followed by period — this shouldn't
    // happen in properly constructed nested lists, but just in case:
    // We infer from parent nesting depth
    const parentLi = ol.closest('li');
    const grandparentOl = parentLi?.closest('ol');
    const greatGrandparentLi = grandparentOl?.closest('li');

    if (!grandparentOl) {
      // First level nesting → alpha
      ol.setAttribute('type', 'a');
    } else if (!greatGrandparentLi) {
      // Second level nesting → roman
      ol.setAttribute('type', 'i');
    }
    // Third level stays as default numbered
  });
}

// ─── Process one archive HTML file ────────────────────────────────────────

function processFile(filePath: string): boolean {
  const original = readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(original);
  const document = dom.window.document;

  let changed = false;

  // Process all <li> elements in the document
  const allLis = document.querySelectorAll('li');
  allLis.forEach(li => {
    if (transformLi(li)) changed = true;
  });

  // Also fix any existing nested <ol> type attributes at the document level
  document.querySelectorAll('li > ol').forEach(ol => {
    if (!ol.getAttribute('type')) {
      const parentLi = ol.closest('li');
      const grandparentOl = parentLi?.closest('ol');
      if (!grandparentOl) {
        (ol as Element).setAttribute('type', 'a');
        changed = true;
      } else {
        const greatGrandOl = grandparentOl?.closest('li')?.closest('ol');
        if (!greatGrandOl) {
          (ol as Element).setAttribute('type', 'i');
          changed = true;
        }
      }
    }
  });

  if (!changed) return false;

  // Serialize: JSDOM wraps in <html><head><body>, extract body content
  const body = document.body.innerHTML;

  // Preserve original file structure (JSDOM adds whitespace/entities we don't want)
  // Write the body innerHTML back — we need to match the original file format
  // The archive files are fragments (no html/head/body wrapper), so write body content
  writeFileSync(filePath, body, 'utf-8');
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('Fixing list nesting in archive HTML files...\n');

  const files = readdirSync(ARCHIVE_DIR)
    .filter(f => f.endsWith('.html') && f !== 'README.md')
    .sort();

  let modified = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(ARCHIVE_DIR, file);
    const wasModified = processFile(filePath);
    if (wasModified) {
      console.log(`  ✓ Fixed: ${file}`);
      modified++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Modified: ${modified}, Unchanged: ${skipped}, Total: ${files.length}`);
  console.log('\nNext step: npm run parse');
}

main();
