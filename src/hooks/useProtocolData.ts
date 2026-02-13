import { useEffect, useState } from 'react';
import type {
  TableOfContents,
  Protocol,
  Category,
  SearchIndex,
  AppMetadata
} from '@/types/protocol';

// Hook to load table of contents
export function useTOC() {
  const [toc, setTOC] = useState<TableOfContents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch('/data/toc.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load table of contents');
        return res.json();
      })
      .then(data => {
        setTOC(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load TOC:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { toc, loading, error };
}

// Hook to load a specific protocol
export function useProtocol(protocolId: string | undefined) {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!protocolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const category = protocolId.split('_')[0];

    fetch(`/data/protocols/${category}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${category} protocols`);
        return res.json();
      })
      .then((protocols: Protocol[]) => {
        const found = protocols.find(p => p.id === protocolId);
        if (!found) {
          throw new Error(`Protocol ${protocolId} not found`);
        }
        setProtocol(found);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load protocol:', err);
        setError(err);
        setLoading(false);
      });
  }, [protocolId]);

  return { protocol, loading, error };
}

// Hook to load all protocols for a category
export function useCategory(categoryId: string | undefined) {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get category info from TOC
  const { toc } = useTOC();

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/data/protocols/${categoryId}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${categoryId} protocols`);
        return res.json();
      })
      .then((data: Protocol[]) => {
        setProtocols(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load category:', err);
        setError(err);
        setLoading(false);
      });
  }, [categoryId]);

  useEffect(() => {
    if (toc && categoryId) {
      const cat = toc.categories.find(c => c.id === categoryId);
      setCategory(cat || null);
    }
  }, [toc, categoryId]);

  return { protocols, category, loading, error };
}

// Hook to load search index
export function useSearchIndex() {
  const [searchIndex, setSearchIndex] = useState<SearchIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadIndex = () => {
    if (searchIndex.length > 0) return; // Already loaded

    setLoading(true);
    setError(null);

    fetch('/data/search-index.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load search index');
        return res.json();
      })
      .then(data => {
        setSearchIndex(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load search index:', err);
        setError(err);
        setLoading(false);
      });
  };

  return { searchIndex, loading, error, loadIndex };
}

// Hook to load app metadata
export function useMetadata() {
  const [metadata, setMetadata] = useState<AppMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch('/data/metadata.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load metadata');
        return res.json();
      })
      .then(data => {
        setMetadata(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load metadata:', err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { metadata, loading, error };
}
