import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useProtocol, useTOC } from '@/hooks/useProtocolData';
import { ProviderLevelTabs } from '@/components/ProviderLevelTabs';
import { useAppStore } from '@/store/useAppStore';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { extractMermaidContent } from '@/utils/parseMermaid';
import { renderProtocolHtml } from '@/utils/renderProtocolHtml';
import { ProtocolSummaryView } from '@/components/ProtocolSummaryView';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

type ViewMode = 'summary' | 'fulltext' | 'original';

const LEVEL_STYLES: Record<string, { border: string; iconBg: string; pillGrad: string; label: string }> = {
  EMT:                         { border: 'border-l-green-500',  iconBg: 'bg-green-50 dark:bg-green-900/20',   pillGrad: 'from-green-700 to-green-500 text-white',         label: 'EMT' },
  ADVANCED_EMT:                { border: 'border-l-yellow-500', iconBg: 'bg-yellow-50 dark:bg-yellow-900/20', pillGrad: 'from-yellow-600 to-yellow-400 text-gray-900',    label: 'Advanced EMT' },
  PARAMEDIC:                   { border: 'border-l-red-500',    iconBg: 'bg-red-50 dark:bg-red-900/20',       pillGrad: 'from-red-700 to-red-500 text-white',             label: 'Paramedic' },
  EMT_ADVANCED_EMT:            { border: 'border-l-green-400',  iconBg: 'bg-green-50 dark:bg-green-900/20',   pillGrad: 'from-green-600 to-yellow-500 text-white',        label: 'EMT / Advanced EMT' },
  ADVANCED_EMT_PARAMEDIC:      { border: 'border-l-yellow-400', iconBg: 'bg-yellow-50 dark:bg-yellow-900/20', pillGrad: 'from-yellow-500 to-red-500 text-white',          label: 'Advanced EMT / Paramedic' },
  EMT_ADVANCED_EMT_PARAMEDIC:  { border: 'border-l-green-400',  iconBg: 'bg-green-50 dark:bg-green-900/20',   pillGrad: 'from-green-600 to-red-500 text-white',           label: 'EMT / Advanced EMT / Paramedic' },
  PEARLS:                      { border: 'border-l-amber-500',  iconBg: 'bg-amber-50 dark:bg-amber-900/20',   pillGrad: 'from-amber-500 to-yellow-400 text-white',        label: 'PEARLS' },
  ALL:                         { border: 'border-l-gray-200',   iconBg: 'bg-gray-50 dark:bg-gray-800',        pillGrad: '',                                              label: '' },
};

export function ProtocolPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const { protocol, loading, error } = useProtocol(protocolId);
  const { toc } = useTOC();
  const { providerLevel } = useAppStore();
  const navigate = useNavigate();

  // Flat ordered list of all protocol ids from TOC
  const allProtocolIds = toc
    ? toc.categories.flatMap(c => c.protocols.map(p => p.id))
    : [];
  const currentIndex = protocolId ? allProtocolIds.indexOf(protocolId) : -1;
  const prevId = currentIndex > 0 ? allProtocolIds[currentIndex - 1] : null;
  const nextId = currentIndex >= 0 && currentIndex < allProtocolIds.length - 1 ? allProtocolIds[currentIndex + 1] : null;
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Clear refs when protocol changes (must be before any early returns)
  useEffect(() => {
    sectionRefs.current.clear();
  }, [protocolId]);

  // Scroll to specific page when hash is present in URL
  useEffect(() => {
    if (!protocol) return;

    const hash = window.location.hash.substring(1); // Remove the '#'
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const yOffset = -120; // Offset for sticky header + tabs
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [protocol]);

  // Scroll to provider level section when tab is clicked
  useEffect(() => {
    if (providerLevel === 'ALL') {
      // Scroll to top when "Top" is clicked
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (providerLevel) {
      // Small delay to ensure refs are set
      setTimeout(() => {
        const targetElement = sectionRefs.current.get(providerLevel);

        if (targetElement) {
          // Scroll with offset for sticky header (60px) + tabs (52px) = 112px
          const yOffset = -120;
          const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [providerLevel]);

  if (loading) {
    return <div className="text-center py-12">Loading protocol...</div>;
  }

  if (error || !protocol) {
    return <div className="text-center py-12 text-red-600">Protocol not found</div>;
  }

  const categoryId = protocol.category;

  // Available provider levels from unified steps
  const availableLevels = Array.from(
    new Set(
      protocol.steps
        .map(s => s.providerLevel)
        .filter(l => l !== 'ALL' && l !== 'PEARLS')
    )
  );

  // Helper to set ref for first occurrence of each provider level
  const setRef = (providerLevelType: string, el: HTMLDivElement | null) => {
    if (el && !sectionRefs.current.has(providerLevelType)) {
      sectionRefs.current.set(providerLevelType, el);
    }
  };

  // Combined levels match any of their constituent providers
  const levelIncludes = (sectionLevel: string, selected: string): boolean => {
    if (sectionLevel === selected) return true;
    if (sectionLevel === 'EMT_ADVANCED_EMT_PARAMEDIC') return true;
    if (sectionLevel === 'EMT_ADVANCED_EMT') return selected === 'EMT' || selected === 'ADVANCED_EMT';
    if (sectionLevel === 'ADVANCED_EMT_PARAMEDIC') return selected === 'ADVANCED_EMT' || selected === 'PARAMEDIC';
    return false;
  };

  // Helper to get color bars for provider level (returns array of Tailwind classes)
  const getProviderLevelColors = (level: string): string[] => {
    const colorMap: Record<string, string[]> = {
      EMT: ['bg-green-500'],
      ADVANCED_EMT: ['bg-yellow-500'],
      PARAMEDIC: ['bg-red-500'],
      EMT_ADVANCED_EMT: ['bg-green-500', 'bg-yellow-500'],
      ADVANCED_EMT_PARAMEDIC: ['bg-yellow-500', 'bg-red-500'],
      EMT_ADVANCED_EMT_PARAMEDIC: ['bg-green-500', 'bg-yellow-500', 'bg-red-500'],
      PEARLS: ['bg-amber-500'],
    };
    return colorMap[level] || [];
  };

  // Handle clicks on protocol reference links
  const handleProtocolClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('protocol-ref-link')) {
      e.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        navigate(href);
      }
    }
  };

  return (
    <PhotoProvider>
      {/* Provider Level Tabs — hidden on Original tab */}
      {viewMode !== 'original' && <ProviderLevelTabs availableLevels={availableLevels} />}

      <div className="pt-4">
        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
        <Link to="/" className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Home
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link
          to={`/category/${categoryId}`}
          className="hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}
        </Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white font-medium">{protocol.title}</span>
      </nav>

      {/* Protocol Header */}
      <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center gap-3">
        <button
          onClick={() => { if (prevId) { window.scrollTo(0, 0); navigate(`/protocol/${prevId}`); } }}
          disabled={!prevId}
          className="flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label="Previous protocol"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            {protocol.title}
          </h1>
        </div>

        <button
          onClick={() => { if (nextId) { window.scrollTo(0, 0); navigate(`/protocol/${nextId}`); } }}
          disabled={!nextId}
          className="flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
          aria-label="Next protocol"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1 mb-6 bg-gray-200 dark:bg-gray-700 rounded-xl p-1">
        {([['summary', '⬡ Summary'], ['fulltext', '≡ Full Text'], ['original', '⊡ Original']] as [ViewMode, string][]).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === mode
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Summary view */}
      {viewMode === 'summary' && <ProtocolSummaryView protocol={protocol} />}

      {/* Original view */}
      {viewMode === 'original' && (
        <div className="space-y-4">
          {protocol.pages.map((page) => (
            page.jpgReference ? (
              <div key={page.pageId} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {page.pageNumber}
                </div>
                <img src={page.jpgReference} alt={`Original ${page.pageNumber}`} className="w-full block" />
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* Full Text view */}
      {viewMode === 'fulltext' && (
        <div onClick={handleProtocolClick}>
          {/* Unified stream: intro items + steps, grouped by provider level.
              Level order is derived from first-appearance across both intro and steps,
              so that all content for each level stays together regardless of page splits. */}
          {(() => {
            // Collect all distinct provider levels, then sort by canonical hierarchy
            const LEVEL_RANK: Record<string, number> = {
              ALL: 0,
              EMT: 1,
              EMT_ADVANCED_EMT: 2,
              ADVANCED_EMT: 3,
              ADVANCED_EMT_PARAMEDIC: 4,
              EMT_ADVANCED_EMT_PARAMEDIC: 5,
              PARAMEDIC: 6,
              PEARLS: 7,
            };
            const seenLevels = new Set<string>();
            for (const item of protocol.intro) seenLevels.add(item.providerLevel);
            for (const step of protocol.steps) seenLevels.add(step.providerLevel);
            const levelOrder = [...seenLevels].sort(
              (a, b) => (LEVEL_RANK[a] ?? 99) - (LEVEL_RANK[b] ?? 99)
            );

            // Build one group per level with all its intro items and steps
            const groups = levelOrder.map(level => ({
              level,
              introItems: protocol.intro.filter(item => item.providerLevel === level),
              stepItems: protocol.steps.filter(step => step.providerLevel === level),
            }));

            return groups.map((group, gi) => {
              const s = LEVEL_STYLES[group.level] ?? LEVEL_STYLES.ALL;
              const isHighlighted = providerLevel !== 'ALL' && levelIncludes(group.level, providerLevel);
              const colors = getProviderLevelColors(group.level);
              const { introItems, stepItems } = group;

              return (
                <React.Fragment key={gi}>
                  {/* Provider level divider pill */}
                  {s.pillGrad && (
                    <div
                      ref={el => setRef(group.level, el as HTMLDivElement | null)}
                      className="flex items-center gap-3 my-5"
                    >
                      <span className={`bg-gradient-to-r ${s.pillGrad} text-[10px] font-extrabold tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-sm whitespace-nowrap`}>
                        {s.label}
                      </span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                  )}
                  <div className={`relative pl-6 mb-4 ${isHighlighted ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg' : ''}`}>
                    {/* Color bar(s) on left */}
                    {colors.length > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 flex rounded-l-lg overflow-hidden">
                        {colors.map((color, ci) => <div key={ci} className={`w-1 ${color}`} />)}
                      </div>
                    )}
                    {/* Intro content for this level (paragraphs, tables, mermaid) */}
                    {introItems.map((item, ii) => (
                      <div key={`i-${ii}`} className="mb-3">
                        {item.type === 'mermaid'
                          ? <MermaidDiagram content={extractMermaidContent(item.html) || ''} id={`g${gi}-i${ii}`} />
                          : <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {renderProtocolHtml(item.html)}
                            </div>
                        }
                      </div>
                    ))}
                    {/* Numbered steps for this level */}
                    {stepItems.length > 0 && (
                      <ol
                        start={stepItems[0].num}
                        className="pl-5 space-y-2 leading-relaxed"
                        style={{ listStyleType: 'decimal' }}
                      >
                        {stepItems.map(step => (
                          <li key={step.num} value={step.num} className="text-sm text-gray-800 dark:text-gray-200">
                            {renderProtocolHtml(step.html)}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </React.Fragment>
              );
            });
          })()}

          {/* PEARLS sections */}
          {protocol.pearls.length > 0 && (
            <div className="mt-6">
              {protocol.pearls.map((pearl, i) => (
                <div key={i} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-extrabold tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-sm">
                      {pearl.title ? `PEARLS: ${pearl.title}` : 'PEARLS'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                    {pearl.html.map((h, j) => (
                      <div key={j}>{renderProtocolHtml(h)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View Original buttons */}
          {protocol.pages.some(p => p.jpgReference) && (
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              {protocol.pages.filter(p => p.jpgReference).map((page, i) => (
                <PhotoView key={i} src={page.jpgReference}>
                  <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-xs font-medium text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    View Original {page.pageNumber}
                  </button>
                </PhotoView>
              ))}
            </div>
          )}
        </div>
      )} {/* end fulltext */}

      {/* Back to category button */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Link
          to={`/category/${categoryId}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to {categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}</span>
        </Link>
      </div>
      </div>
    </PhotoProvider>
  );
}
