import { Link, useParams, useNavigate } from 'react-router-dom';
import { useCategory } from '@/hooks/useProtocolData';

export function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { protocols, category, loading, error } = useCategory(categoryId);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error || !category) {
    return <div className="text-center py-12 text-red-600">Category not found</div>;
  }

  return (
    <div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Categories</span>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: category.color }}>
          {category.displayName}
        </h1>
        <div className="flex items-center gap-2">
          <span
            className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: category.color }}
          >
            {protocols.length} protocol{protocols.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {protocols.map((protocol) => (
          <Link
            key={protocol.id}
            to={`/protocol/${protocol.id}`}
            className="group flex items-center justify-between p-5 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200 border-l-4"
            style={{ borderLeftColor: category.color }}
          >
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:underline mb-1">
                {protocol.title}
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-1 items-center">
                {protocol.pages.filter(p => p.pageNumber).map((page, idx) => (
                  <span key={page.pageId}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/protocol/${protocol.id}#${page.pageId}`);
                      }}
                      className="hover:underline hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer bg-transparent border-0 p-0 font-inherit"
                    >
                      {page.pageNumber}
                    </button>
                    {idx < protocol.pages.filter(p => p.pageNumber).length - 1 && ', '}
                  </span>
                )) || `${protocol.pages.length} page${protocol.pages.length !== 1 ? 's' : ''}`}
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
          </Link>
        ))}
      </div>
    </div>
  );
}
