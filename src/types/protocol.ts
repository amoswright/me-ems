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

// Protocol data types
export interface Protocol {
  id: string;              // 'blue_006_007_008' for multi-page
  title: string;           // 'Respiratory Distress with Bronchospasm'
  category: string;        // 'blue'
  pages: ProtocolPage[];
}

export interface ProtocolPage {
  pageId: string;          // 'blue_006'
  pageNumber: string;      // 'Blue 6'
  jpgReference: string;    // '/assets/pages_jpg/025.jpg'
  isContinuation: boolean; // Has "(Continued from previous page)"
  sections: ProtocolSection[];
}

export interface ProtocolSection {
  type: 'header' | 'content' | 'list' | 'table' | 'mermaid' | 'pearls';
  providerLevel: ProviderLevel;
  content: string | ListData | TableData | MermaidDiagram;
  html: string;            // Preserve original HTML for rendering
  pearlsTitle?: string;    // Optional title for PEARLS sections (e.g., "Seizures", "Persistent Seizures")
}

// Content type definitions
export interface ListData {
  type: 'ordered' | 'unordered';
  startNumber?: number;    // For continued lists
  items: ListItem[];
}

export interface ListItem {
  content: string;
  nestedList?: ListData;
}

export interface TableData {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface MermaidDiagram {
  type: 'mermaid';
  code: string;            // Mermaid diagram code
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
