import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';

export interface SearchIndexItem {
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

export interface SearchResult {
  item: SearchIndexItem;
  score: number;
  matches?: Fuse.FuseResultMatch[];
}

export interface SearchFilters {
  category?: string;
  providerLevel?: string;
  type?: 'protocol' | 'pearls' | 'medication';
}

export function useSearch() {
  const [searchIndex, setSearchIndex] = useState<SearchIndexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadSearchIndex() {
      try {
        const response = await fetch('/data/search-index.json');
        if (!response.ok) {
          throw new Error('Failed to load search index');
        }
        const data = await response.json();
        setSearchIndex(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    loadSearchIndex();
  }, []);

  const fuse = useMemo(() => {
    if (searchIndex.length === 0) return null;

    return new Fuse(searchIndex, {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'content', weight: 2 },
        { name: 'keywords', weight: 2.5 },
        { name: 'categoryName', weight: 1 },
        { name: 'pageNumber', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [searchIndex]);

  const search = useCallback((query: string, filters?: SearchFilters): SearchResult[] => {
    if (!fuse || !query.trim()) {
      return [];
    }

    let results = fuse.search(query);

    // Apply filters
    if (filters) {
      results = results.filter(result => {
        const item = result.item;

        if (filters.category && item.category !== filters.category) {
          return false;
        }

        if (filters.type && item.type !== filters.type) {
          return false;
        }

        if (filters.providerLevel && filters.providerLevel !== 'ALL') {
          // Show item if it's for ALL providers or matches the selected level
          if (item.providerLevels.length > 0 &&
              !item.providerLevels.includes('ALL') &&
              !item.providerLevels.includes(filters.providerLevel)) {
            return false;
          }
        }

        return true;
      });
    }

    // Limit to top 50 results
    return results.slice(0, 50).map(result => ({
      item: result.item,
      score: result.score || 0,
      matches: result.matches,
    }));
  }, [fuse]);

  return {
    search,
    loading,
    error,
    ready: !loading && !error && searchIndex.length > 0,
  };
}

// Hook for managing search history in localStorage
export function useSearchHistory(maxItems = 10) {
  const STORAGE_KEY = 'meems-search-history';

  const [history, setHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    setHistory(prev => {
      const normalized = query.trim();
      // Remove if already exists
      const filtered = prev.filter(q => q !== normalized);
      // Add to front
      const updated = [normalized, ...filtered].slice(0, maxItems);
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save search history:', err);
      }
      return updated;
    });
  }, [maxItems]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear search history:', err);
    }
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => {
      const updated = prev.filter(q => q !== query);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update search history:', err);
      }
      return updated;
    });
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}
