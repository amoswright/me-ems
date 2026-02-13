import { useAppStore } from '@/store/useAppStore';

export type ProviderLevel =
  | 'ALL'
  | 'EMT'
  | 'ADVANCED_EMT'
  | 'PARAMEDIC'
  | 'EMT_ADVANCED_EMT'
  | 'ADVANCED_EMT_PARAMEDIC'
  | 'EMT_ADVANCED_EMT_PARAMEDIC'
  | 'PEARLS';

interface ProviderLevelTabsProps {
  availableLevels: string[];
}

const LEVEL_CONFIG: Record<string, { label: string; shortLabel: string; order: number; activeColor: string; hoverColor: string; textColor: string }> = {
  ALL: { label: 'Top', shortLabel: 'Top', order: 0, activeColor: 'bg-blue-500', hoverColor: 'hover:bg-gray-200 dark:hover:bg-gray-600', textColor: 'text-white' },
  EMT: { label: 'EMT', shortLabel: 'EMT', order: 1, activeColor: 'bg-green-500', hoverColor: 'hover:bg-green-100 dark:hover:bg-green-900/30', textColor: 'text-white' },
  ADVANCED_EMT: { label: 'Advanced EMT', shortLabel: 'AEMT', order: 2, activeColor: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30', textColor: 'text-gray-900' },
  PARAMEDIC: { label: 'Paramedic', shortLabel: 'PM', order: 3, activeColor: 'bg-red-500', hoverColor: 'hover:bg-red-100 dark:hover:bg-red-900/30', textColor: 'text-white' },
  EMT_ADVANCED_EMT: { label: 'EMT / Advanced EMT', shortLabel: 'EMT/AEMT', order: 1.5, activeColor: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30', textColor: 'text-gray-900' },
  ADVANCED_EMT_PARAMEDIC: { label: 'Advanced EMT / Paramedic', shortLabel: 'AEMT/PM', order: 2.5, activeColor: 'bg-red-500', hoverColor: 'hover:bg-red-100 dark:hover:bg-red-900/30', textColor: 'text-white' },
  EMT_ADVANCED_EMT_PARAMEDIC: { label: 'EMT / Advanced EMT / Paramedic', shortLabel: 'All Providers', order: 1.7, activeColor: 'bg-red-500', hoverColor: 'hover:bg-red-100 dark:hover:bg-red-900/30', textColor: 'text-white' },
  PEARLS: { label: 'PEARLS', shortLabel: 'PEARLS', order: 10, activeColor: 'bg-amber-500', hoverColor: 'hover:bg-amber-100 dark:hover:bg-amber-900/30', textColor: 'text-white' },
};

export function ProviderLevelTabs({ availableLevels }: ProviderLevelTabsProps) {
  const { providerLevel, setProviderLevel } = useAppStore();

  // Build list of tabs to show (always include ALL, then available levels)
  const tabsToShow = ['ALL', ...availableLevels.filter(l => l !== 'ALL')]
    .filter((level, index, self) => self.indexOf(level) === index) // Remove duplicates
    .map(level => ({
      value: level as ProviderLevel,
      ...LEVEL_CONFIG[level],
    }))
    .sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md sticky top-[60px] z-40 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex gap-1 py-2 overflow-x-auto">
          {tabsToShow.map((level) => (
            <button
              key={level.value}
              onClick={() => setProviderLevel(level.value)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                ${
                  providerLevel === level.value
                    ? `${level.activeColor} ${level.textColor} shadow-md`
                    : `bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${level.hoverColor}`
                }
              `}
            >
              <span className="hidden sm:inline">{level.label}</span>
              <span className="sm:hidden">{level.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
