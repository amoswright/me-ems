import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch, useSearchHistory } from '../hooks/useSearch';
import type { SearchResult } from '../hooks/useSearch';

interface SearchBarProps {
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search protocols, medications, keywords...',
  autoFocus = false,
  onSearch,
  className = '',
}: SearchBarProps) {
  const navigate = useNavigate();
  const { search, ready } = useSearch();
  const { history, addToHistory, removeFromHistory } = useSearchHistory();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      const searchResults = search(debouncedQuery);
      setResults(searchResults);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [debouncedQuery, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleInputFocus = () => {
    if (query.trim() && results.length > 0) {
      setShowDropdown(true);
    } else if (!query.trim() && history.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    addToHistory(searchQuery);
    setShowDropdown(false);

    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleResultClick = (result: SearchResult) => {
    addToHistory(query);
    setShowDropdown(false);
    navigate(`/protocol/${result.item.protocolId}`);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  };

  const handleHistoryRemove = (historyQuery: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromHistory(historyQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    const itemCount = query.trim() ? results.length : history.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < itemCount - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (query.trim()) {
            handleResultClick(results[selectedIndex]);
          } else {
            handleHistoryClick(history[selectedIndex]);
          }
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const highlightMatch = (text: string, matches?: any[]) => {
    if (!matches || matches.length === 0) {
      return text;
    }

    // Simple highlighting - can be enhanced
    const match = matches.find(m => m.key === 'title' || m.key === 'content');
    if (!match) return text;

    const indices = match.indices[0];
    if (!indices) return text;

    const [start, end] = indices;
    return (
      <>
        {text.substring(0, start)}
        <mark className="bg-yellow-200 dark:bg-yellow-600 font-semibold">
          {text.substring(start, end + 1)}
        </mark>
        {text.substring(end + 1)}
      </>
    );
  };

  const getCategoryBadgeColor = (category: string) => {
    const colorMap: Record<string, string> = {
      brown: 'bg-amber-700 text-white',
      purple: 'bg-purple-600 text-white',
      blue: 'bg-blue-600 text-white',
      red: 'bg-red-600 text-white',
      gold: 'bg-yellow-600 text-white',
      green: 'bg-green-600 text-white',
      yellow: 'bg-yellow-500 text-black',
      lavender: 'bg-purple-400 text-white',
      pink: 'bg-pink-600 text-white',
      orange: 'bg-orange-600 text-white',
      grey: 'bg-gray-600 text-white',
    };
    return colorMap[category] || 'bg-gray-500 text-white';
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={!ready}
          autoFocus={autoFocus}
          className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Search protocols"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls="search-results"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700
                     dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>
      </form>

      {showDropdown && (
        <div
          ref={dropdownRef}
          id="search-results"
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300
                     dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          role="listbox"
        >
          {query.trim() ? (
            results.length > 0 ? (
              <div>
                <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </div>
                {results.map((result, index) => (
                  <button
                    key={result.item.id}
                    onClick={() => handleResultClick(result)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700
                                hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                                ${selectedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    role="option"
                    aria-selected={selectedIndex === index}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {highlightMatch(result.item.title, result.matches)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                          {result.item.content}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span
                            className={`text-xs px-2 py-1 rounded ${getCategoryBadgeColor(
                              result.item.category
                            )}`}
                          >
                            {result.item.pageNumber}
                          </span>
                          {result.item.type !== 'protocol' && (
                            <span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                              {result.item.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </div>
            )
          ) : history.length > 0 ? (
            <div>
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                Recent searches
              </div>
              {history.map((historyQuery, index) => (
                <button
                  key={historyQuery}
                  onClick={() => handleHistoryClick(historyQuery)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700
                              hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between
                              ${selectedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-gray-900 dark:text-gray-100">{historyQuery}</span>
                  </div>
                  <span
                    onClick={(e) => handleHistoryRemove(historyQuery, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleHistoryRemove(historyQuery, e as any);
                      }
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label="Remove from history"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
