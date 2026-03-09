// Core type definitions for Maine EMS Protocols

export type ProviderLevel =
  | 'EMT'
  | 'ADVANCED_EMT'
  | 'PARAMEDIC'
  | 'ALL'
  | 'EMT_ADVANCED_EMT'
  | 'ADVANCED_EMT_PARAMEDIC'
  | 'EMT_ADVANCED_EMT_PARAMEDIC'
  | 'PEARLS';

// Table of Contents types
export interface TableOfContents {
  categories: Category[];
}

export interface Category {
  id: string;              // 'blue', 'gold', etc.
  name: string;            // 'Respiratory', 'General Medical'
  displayName: string;     // 'Blue - Respiratory'
  color: string;           // Hex color for UI theming
  protocols: ProtocolReference[];
}

export interface ProtocolReference {
  id: string;              // 'blue_006_007_008' for multi-page
  title: string;           // 'Respiratory Distress with Bronchospasm'
  pages: PageReference[];
}

export interface PageReference {
  pageId: string;          // 'blue_006'
  htmlFile: string;        // 'blue_006.html'
  jpgFile: string;         // '/assets/pages_jpg/025.jpg'
  jpgPageNumber: number;   // 25
  protocolPageNumber: string; // 'Blue 6'
}

// A single numbered step (one <li> from the unified protocol list)
export interface ProtocolStep {
  num: number;              // Step number (1, 2, 3...) from <ol> start attribute
  providerLevel: ProviderLevel;
  html: string;             // innerHTML of the <li> (may include nested ol/ul)
}

// Non-step content (intro text, mermaid diagrams, tables, bullet lists)
export interface ProtocolIntroItem {
  type: 'content' | 'mermaid' | 'table' | 'list';
  providerLevel: ProviderLevel;
  html: string;
}

// A PEARLS section
export interface ProtocolPearl {
  title?: string;           // e.g. "Allergy/Anaphylaxis" from "PEARLS for Allergy/Anaphylaxis"
  html: string[];           // array of HTML strings (paragraphs, lists)
}

// Protocol data type
export interface Protocol {
  id: string;
  title: string;
  category: string;
  intro: ProtocolIntroItem[];    // non-step content (definitions, mermaid, tables, bullet lists)
  steps: ProtocolStep[];         // THE one unified numbered list across all pages/levels
  pearls: ProtocolPearl[];       // PEARLS sections (rendered separately)
  pages: Array<{ pageId: string; pageNumber: string; jpgReference: string }>;  // for Original tab only
}

// Search types
export interface SearchIndex {
  id: string;
  category: string;
  title: string;
  content: string;
  providerLevels: string[];
  keywords: string[];
}

export interface SearchResult extends SearchIndex {
  score?: number;
}

// App metadata
export interface AppMetadata {
  buildDate: string;
  version: string;
  totalProtocols: number;
  totalPages: number;
  categories: number;
}
