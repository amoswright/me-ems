import fs from 'fs';
import path from 'path';

interface ProtocolSection {
  type: string;
  providerLevel: string;
  content: string;
  html: string;
  pearlsTitle?: string;
}

interface ProtocolPage {
  pageId: string;
  pageNumber: string;
  jpgReference: string;
  isContinuation: boolean;
  sections: ProtocolSection[];
}

interface Protocol {
  id: string;
  title: string;
  category: string;
  pages: ProtocolPage[];
}

type CategoryData = Protocol[];

interface TOCProtocol {
  id: string;
  title: string;
  pageCount: number;
  pages: string[];
}

interface TOCCategory {
  id: string;
  name: string;
  displayName: string;
  color: string;
  protocols: TOCProtocol[];
}

interface TOC {
  categories: TOCCategory[];
}

interface SearchIndexItem {
  id: string;
  protocolId: string;
  title: string;
  category: string;
  categoryName: string;
  pageNumber: string;
  content: string;
  keywords: string[];
  providerLevels: string[];
  type: 'protocol' | 'pearls' | 'medication';
}

// Medical terms and keywords to extract
const MEDICAL_KEYWORDS = [
  'airway', 'breathing', 'circulation', 'disability', 'exposure',
  'cardiac', 'respiratory', 'trauma', 'stroke', 'seizure',
  'hypoglycemia', 'anaphylaxis', 'asthma', 'copd', 'chf',
  'hypotension', 'hypertension', 'bradycardia', 'tachycardia',
  'oxygen', 'ventilation', 'intubation', 'cpap', 'bvm',
  'iv', 'io', 'fluid', 'bolus', 'infusion',
  'emt', 'aemt', 'paramedic', 'als', 'bls'
];

// Common medication patterns
const MEDICATION_PATTERNS = [
  /\b(epinephrine|epi)\b/gi,
  /\b(albuterol)\b/gi,
  /\b(nitroglycerin|nitro)\b/gi,
  /\b(aspirin|asa)\b/gi,
  /\b(morphine)\b/gi,
  /\b(fentanyl)\b/gi,
  /\b(naloxone|narcan)\b/gi,
  /\b(glucose|dextrose|d50)\b/gi,
  /\b(atropine)\b/gi,
  /\b(amiodarone)\b/gi,
  /\b(lidocaine)\b/gi,
  /\b(adenosine)\b/gi,
  /\b(diphenhydramine|benadryl)\b/gi,
  /\b(ondansetron|zofran)\b/gi,
  /\b(midazolam|versed)\b/gi,
  /\b(lorazepam|ativan)\b/gi,
  /\b(ketamine)\b/gi,
  /\b(dopamine)\b/gi,
  /\b(norepinephrine|levophed)\b/gi,
  /\b(oxytocin|pitocin)\b/gi,
];

function cleanText(text: string): string {
  // Remove HTML tags
  let cleaned = text.replace(/<[^>]*>/g, ' ');
  // Remove mermaid diagrams
  cleaned = cleaned.replace(/<mermaid>[\s\S]*?<\/mermaid>/g, '');
  // Remove markdown syntax
  cleaned = cleaned.replace(/[#*_`]/g, '');
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const lowerText = text.toLowerCase();

  // Extract medical keywords
  MEDICAL_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  // Extract medications
  MEDICATION_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => keywords.add(match.toLowerCase()));
    }
  });

  return Array.from(keywords);
}

function extractMedications(text: string): string[] {
  const medications = new Set<string>();

  MEDICATION_PATTERNS.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => medications.add(match.toLowerCase()));
    }
  });

  return Array.from(medications);
}

function generateSearchIndex(): void {
  console.log('🔍 Generating search index...');

  const protocolsDir = path.join(process.cwd(), 'public', 'data', 'protocols');
  const tocPath = path.join(process.cwd(), 'public', 'data', 'toc.json');
  const outputPath = path.join(process.cwd(), 'public', 'data', 'search-index.json');

  // Load TOC for category metadata
  const toc: TOC = JSON.parse(fs.readFileSync(tocPath, 'utf-8'));
  const categoryMap = new Map<string, TOCCategory>();
  toc.categories.forEach(cat => categoryMap.set(cat.id, cat));

  const searchIndex: SearchIndexItem[] = [];
  let itemCount = 0;

  // Read all protocol files
  const protocolFiles = fs.readdirSync(protocolsDir).filter(f => f.endsWith('.json'));

  protocolFiles.forEach(file => {
    const categoryId = file.replace('.json', '');
    const category = categoryMap.get(categoryId);
    if (!category) {
      console.warn(`⚠️  Category not found in TOC: ${categoryId}`);
      return;
    }

    const filePath = path.join(protocolsDir, file);
    const protocols: CategoryData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`  📄 Processing ${categoryId}: ${protocols.length} protocols`);

    protocols.forEach(protocol => {
      protocol.pages.forEach(page => {
        const allContent: string[] = [];
        const providerLevels = new Set<string>();
        const pearlsSections: string[] = [];

        page.sections.forEach(section => {
          // For lists/tables, content is an object - use html instead
          const textContent = typeof section.content === 'string' ? section.content : section.html;
          const cleanContent = cleanText(textContent || '');
          allContent.push(cleanContent);

          if (section.providerLevel && section.providerLevel !== 'ALL') {
            providerLevels.add(section.providerLevel);
          }

          // Track PEARLS sections separately
          if (section.type === 'content' && section.pearlsTitle) {
            pearlsSections.push(`${section.pearlsTitle}: ${cleanContent}`);
          }
        });

        const fullContent = allContent.join(' ');
        const keywords = extractKeywords(fullContent);
        const medications = extractMedications(fullContent);

        // Add main protocol search item
        searchIndex.push({
          id: `${protocol.id}_${page.pageId}`,
          protocolId: protocol.id,
          title: protocol.title,
          category: categoryId,
          categoryName: category.displayName,
          pageNumber: page.pageNumber,
          content: fullContent.substring(0, 2000), // First 2000 chars for preview
          keywords,
          providerLevels: Array.from(providerLevels),
          type: 'protocol'
        });
        itemCount++;

        // Add PEARLS as separate searchable items
        pearlsSections.forEach((pearlContent, index) => {
          searchIndex.push({
            id: `${protocol.id}_${page.pageId}_pearl_${index}`,
            protocolId: protocol.id,
            title: `${protocol.title} - PEARLS`,
            category: categoryId,
            categoryName: category.displayName,
            pageNumber: page.pageNumber,
            content: pearlContent,
            keywords: extractKeywords(pearlContent),
            providerLevels: ['ALL'],
            type: 'pearls'
          });
          itemCount++;
        });

        // Add medications as separate searchable items
        medications.forEach(med => {
          searchIndex.push({
            id: `${protocol.id}_${page.pageId}_med_${med}`,
            protocolId: protocol.id,
            title: `${protocol.title} - ${med}`,
            category: categoryId,
            categoryName: category.displayName,
            pageNumber: page.pageNumber,
            content: fullContent.substring(0, 2000), // Increased to match protocol items
            keywords: [med, ...keywords],
            providerLevels: Array.from(providerLevels),
            type: 'medication'
          });
          itemCount++;
        });
      });
    });
  });

  // Write search index
  fs.writeFileSync(outputPath, JSON.stringify(searchIndex, null, 2));

  console.log(`✅ Search index generated: ${itemCount} searchable items`);
  console.log(`   📝 Output: ${outputPath}`);
  console.log(`   📊 Index size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
}

// Run the script
generateSearchIndex();
