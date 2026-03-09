#!/usr/bin/env tsx
/**
 * cleanup-archive.ts
 *
 * Removes vestigial PDF-conversion artifacts from archive HTML files using JSDOM:
 *
 *   • <p> elements whose text content is purely a "continued" variant
 *     ("(Continued)", "(Continued from previous page)", "(IO continued...)", etc.)
 *     including those with <br> tags mixed in → remove whole element
 *   • <p> / <li> elements containing "Back to TOC" → remove whole element
 *   • "(Continued)" text embedded at end/start of meaningful content → strip text only
 *   • <hr> elements → delete
 *   • Trailing blank lines → normalise to single newline at end
 *
 * Preserves meaningful parenthetical subtitles like
 *   "(COPD, Emphysema, Chronic Bronchitis, Asthma)"
 *
 * After running: npm run parse
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVE_DIR = path.join(__dirname, '..', 'archive-html-files');

// Matches text content that is ONLY a "continued" variant (possibly with page nav)
const CONTINUED_TEXT_RE = /^\s*\(\s*(IO\s+)?[Cc]ontinued[^)]*\)\s*$/;
// Matches "Back to TOC" anywhere in text
const BACK_TO_TOC_RE = /Back to TOC|back to toc/i;
// Strips a trailing "(Continued…)" from a text node
const STRIP_TRAILING_RE = /\s*\(\s*(IO\s+)?[Cc]ontinued[^)]*\)\s*$/;
// Strips a leading "(Continued…)" from a text node
const STRIP_LEADING_RE = /^\s*\(\s*(IO\s+)?[Cc]ontinued[^)]*\)\s*/;

// ─── Process one file ─────────────────────────────────────────────────────

function processFile(filePath: string): boolean {
  const original = readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(original);
  const document = dom.window.document;

  let changed = false;

  // 1. Remove all <hr> elements
  document.querySelectorAll('hr').forEach(el => {
    el.remove();
    changed = true;
  });

  // 2. Remove <p> and <li> elements whose entire text is a "continued" or "Back to TOC" variant
  //    This catches patterns like:
  //      <p>(Continued)</p>
  //      <p>(Continued)<br />(Back to TOC)<br />&lt;page_number&gt;...&lt;/page_number&gt;</p>
  //      <p>(Continued from previous page)<br /></p>
  document.querySelectorAll('p').forEach(el => {
    const text = el.textContent?.trim() ?? '';
    if (
      CONTINUED_TEXT_RE.test(text) ||
      BACK_TO_TOC_RE.test(text) ||
      // <p> whose content is only continued + page navigation noise
      /^\s*\(\s*(IO\s+)?[Cc]ontinued[^)]*\)[\s\S]*$/.test(text) && text.length < 120
    ) {
      // Only remove if the paragraph doesn't have substantial non-nav content
      const nonNavText = text
        .replace(/\(\s*(IO\s+)?[Cc]ontinued[^)]*\)/gi, '')
        .replace(/Back to TOC/gi, '')
        .replace(/<page_number>[^<]*<\/page_number>/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (nonNavText.length < 20) {
        el.remove();
        changed = true;
      }
    }
  });

  // 3. Strip embedded "(Continued)" text nodes from within any element
  //    Handles: "...hypoperfusion (Continued)</p>" or "(Continued)\n</li>"
  const walker = document.createTreeWalker(
    document.body,
    4 /* NodeFilter.SHOW_TEXT */
  );
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const data = textNode.data;
    let updated = data
      .replace(STRIP_TRAILING_RE, '')
      .replace(STRIP_LEADING_RE, '');
    if (updated !== data) {
      // If the text node becomes empty, remove it entirely
      if (updated.trim() === '') {
        // Check if parent element now has no meaningful children and can be removed
        const parent = textNode.parentElement;
        textNode.remove();
        if (parent && parent.textContent?.trim() === '' &&
            ['P', 'LI', 'SPAN', 'DIV'].includes(parent.tagName)) {
          // Only remove truly empty wrapper elements
          if (!parent.querySelector('img, svg, table, ol, ul')) {
            parent.remove();
          }
        }
      } else {
        textNode.data = updated;
      }
      changed = true;
    }
  }

  if (!changed) return false;

  // Serialize: JSDOM wraps in <html><head><body>, extract body content
  const body = document.body.innerHTML;
  // Collapse multiple blank lines
  const normalized = body.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  writeFileSync(filePath, normalized, 'utf-8');
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('Cleaning up vestigial PDF artifacts from archive HTML files...\n');

  const files = readdirSync(ARCHIVE_DIR)
    .filter(f => f.endsWith('.html') && f !== 'README.md')
    .sort();

  let modified = 0;

  for (const file of files) {
    const filePath = path.join(ARCHIVE_DIR, file);
    if (processFile(filePath)) {
      console.log(`  ✓ Cleaned: ${file}`);
      modified++;
    }
  }

  console.log(`\nDone. Modified: ${modified} / ${files.length} files`);
  console.log('Next step: npm run parse');
}

main();
