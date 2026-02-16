import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch } from '../hooks/useSearch';
import type { SearchResult, SearchFilters } from '../hooks/useSearch';
import { SearchBar } from '../components/SearchBar';
import { getContextSnippet, highlightMatches } from '../utils/searchUtils';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'brown', label: 'Brown - Foreword' },
  { value: 'purple', label: 'Purple - General Patient Care' },
  { value: 'blue', label: 'Blue - Respiratory' },
  { value: 'red', label: 'Red - Cardiac' },
  { value: 'gold', label: 'Gold - General Medical' },
  { value: 'green', label: 'Green - Trauma' },
  { value: 'yellow', label: 'Yellow - Toxicologic' },
  { value: 'lavender', label: 'Lavender - Obstetric/Gynecologic' },
  { value: 'pink', label: 'Pink - Pediatric' },
  { value: 'orange', label: 'Orange - Behavioral' },
  { value: 'grey', label: 'Grey - Operational' },
];

const PROVIDER_LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'EMT', label: 'EMT' },
  { value: 'ADVANCED_EMT', label: 'Advanced EMT' },
  { value: 'PARAMEDIC', label: 'Paramedic' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'protocol', label: 'Protocols' },
  { value: 'pearls', label: 'PEARLS' },
  { value: 'medication', label: 'Medications' },
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { search: performSearch } = useSearch();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    category: searchParams.get('category') || '',
    providerLevel: searchParams.get('level') || '',
    type: (searchParams.get('type') as any) || '',
  });

  const query = searchParams.get('q') || '';

  useEffect(() => {
    if (query) {
      const searchResults = performSearch(query, {
        category: filters.category || undefined,
        providerLevel: filters.providerLevel || undefined,
        type: filters.type || undefined,
      });
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query, filters, performSearch]);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const handleSearch = (newQuery: string) => {
    const params = new URLSearchParams();
    params.set('q', newQuery);
    if (filters.category) params.set('category', filters.category);
    if (filters.providerLevel) params.set('level', filters.providerLevel);
    if (filters.type) params.set('type', filters.type);
    setSearchParams(params);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Search Protocols</h1>
          <SearchBar onSearch={handleSearch} autoFocus={!query} />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider Level
              </label>
              <select
                value={filters.providerLevel}
                onChange={(e) => handleFilterChange('providerLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROVIDER_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {query ? (
          <div>
            <div className="mb-4 text-gray-600 dark:text-gray-400">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </div>

            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <Link
                    key={result.item.id}
                    to={`/protocol/${result.item.protocolId}`}
                    className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200
                               dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {highlightMatches(result.item.title, result.matches)}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
                          {getContextSnippet(result, 250)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`text-sm px-3 py-1 rounded-full ${getCategoryBadgeColor(
                              result.item.category
                            )}`}
                          >
                            {result.item.pageNumber}
                          </span>
                          {result.item.type !== 'protocol' && (
                            <span className="text-sm px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                              {result.item.type === 'pearls' ? 'PEARLS' : 'Medication'}
                            </span>
                          )}
                          {result.item.providerLevels.length > 0 &&
                            !result.item.providerLevels.includes('ALL') && (
                              <span className="text-sm px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {result.item.providerLevels.join(', ')}
                              </span>
                            )}
                          {result.item.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {result.item.keywords.slice(0, 5).map((keyword) => (
                                <span
                                  key={keyword}
                                  className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {result.score !== undefined && (
                          <div className="text-xs">
                            {Math.round((1 - result.score) * 100)}% match
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Start searching
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Search for protocols, medications, keywords, and more
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
