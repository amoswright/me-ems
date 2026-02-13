import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

export function Header() {
  const { theme, setTheme, textSize, setTextSize } = useAppStore();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 border-b-2 border-blue-500">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              <span className="hidden sm:inline">Maine EMS Protocols</span>
              <span className="sm:hidden">ME EMS</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Text Size Control */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300 hidden md:inline">Size:</span>
              <select
                value={textSize}
                onChange={(e) => setTextSize(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="small">A</option>
                <option value="medium">A+</option>
                <option value="large">A++</option>
                <option value="xlarge">A+++</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
