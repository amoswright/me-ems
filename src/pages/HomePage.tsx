import { Link } from 'react-router-dom';
import { useTOC } from '@/hooks/useProtocolData';

export function HomePage() {
  const { toc, loading, error } = useTOC();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xl text-gray-600 dark:text-gray-300">Loading protocols...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-xl text-red-600">Error loading protocols: {error.message}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Maine EMS Protocols 2025
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg">
          Select a category to view protocols
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {toc?.categories.map((category) => (
          <Link
            key={category.id}
            to={`/category/${category.id}`}
            className="group block bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 border-l-4 hover:scale-102 active:scale-98"
            style={{
              borderLeftColor: category.color,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2
                  className="text-xl sm:text-2xl font-semibold mb-2 group-hover:underline transition-colors"
                  style={{ color: category.color }}
                >
                  {category.displayName}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.protocols.length} protocol{category.protocols.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
