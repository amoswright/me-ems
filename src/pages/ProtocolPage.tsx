import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useProtocol } from '@/hooks/useProtocolData';
import { ProviderLevelTabs } from '@/components/ProviderLevelTabs';
import { useAppStore } from '@/store/useAppStore';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { extractMermaidContent } from '@/utils/parseMermaid';
import { renderProtocolHtml } from '@/utils/renderProtocolHtml';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import 'react-photo-view/dist/react-photo-view.css';

export function ProtocolPage() {
  const { protocolId } = useParams<{ protocolId: string }>();
  const { protocol, loading, error } = useProtocol(protocolId);
  const { providerLevel } = useAppStore();
  const navigate = useNavigate();
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // Calculate available provider levels from protocol sections
  const availableLevels = Array.from(
    new Set(
      protocol.pages.flatMap(page =>
        page.sections
          .map(section => section.providerLevel)
          .filter(level => level !== 'ALL')
      )
    )
  );

  // Helper to set ref for first occurrence of each provider level
  const setRef = (providerLevelType: string, el: HTMLDivElement | null) => {
    if (el && !sectionRefs.current.has(providerLevelType)) {
      sectionRefs.current.set(providerLevelType, el);
    }
  };

  // Helper to get display name for provider level
  const getProviderLevelDisplay = (level: string, pearlsTitle?: string): string => {
    // If this is a PEARLS section with a specific title, use it
    if (level === 'PEARLS' && pearlsTitle) {
      return `PEARLS for ${pearlsTitle}`;
    }

    const displayMap: Record<string, string> = {
      ADVANCED_EMT: 'ADVANCED EMT',
      EMT_ADVANCED_EMT: 'EMT / ADVANCED EMT',
      ADVANCED_EMT_PARAMEDIC: 'ADVANCED EMT / PARAMEDIC',
      EMT_ADVANCED_EMT_PARAMEDIC: 'EMT / ADVANCED EMT / PARAMEDIC',
      PEARLS: 'PEARLS',
    };
    return displayMap[level] || level;
  };

  // Helper to get color bars for provider level (returns array of colors)
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
      {/* Provider Level Tabs */}
      <ProviderLevelTabs availableLevels={availableLevels} />

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
      <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {protocol.title}
        </h1>
        {protocol.pages.length > 1 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {protocol.pages.length} pages
          </p>
        )}
      </div>

      {/* Protocol Content */}
      <div className="space-y-6">
        {protocol.pages.map((page, pageIndex) => (
          <div key={page.pageId} id={page.pageId}>
            {page.isContinuation && pageIndex > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
                <p className="text-sm italic text-blue-800 dark:text-blue-200">
                  Continued from {protocol.pages[pageIndex - 1].pageNumber}
                </p>
              </div>
            )}

            <div className="protocol-content" onClick={handleProtocolClick}>
              {page.sections.map((section, sectionIndex) => {
                // For mermaid sections, extract from HTML field (has <br> tags) and decode entities
                const isMermaidSection = section.type === 'mermaid';
                const mermaidContent = isMermaidSection ? extractMermaidContent(section.html) : null;
                const cleanHtml = isMermaidSection ? '' : section.html;

                // Determine the effective provider level for this section
                // If this is a continuation page and the section is marked as 'ALL',
                // check if it's a list continuing from a previous provider level
                let effectiveProviderLevel = section.providerLevel;
                if (page.isContinuation && section.providerLevel === 'ALL' && section.type === 'list') {
                  // Check if this list starts with a number > 1 (continuation)
                  const listMatch = section.html.match(/start="(\d+)"/);
                  if (listMatch && parseInt(listMatch[1]) > 1 && pageIndex > 0) {
                    // Find the last non-ALL provider level from previous page
                    const prevPage = protocol.pages[pageIndex - 1];
                    for (let i = prevPage.sections.length - 1; i >= 0; i--) {
                      if (prevPage.sections[i].providerLevel !== 'ALL' && prevPage.sections[i].providerLevel !== 'PEARLS') {
                        effectiveProviderLevel = prevPage.sections[i].providerLevel;
                        break;
                      }
                    }
                  }
                }

                // Combined levels match any of their constituent providers
                const levelIncludes = (sectionLevel: string, selected: string): boolean => {
                  if (sectionLevel === selected) return true;
                  if (sectionLevel === 'EMT_ADVANCED_EMT_PARAMEDIC') return true;
                  if (sectionLevel === 'EMT_ADVANCED_EMT') return selected === 'EMT' || selected === 'ADVANCED_EMT';
                  if (sectionLevel === 'ADVANCED_EMT_PARAMEDIC') return selected === 'ADVANCED_EMT' || selected === 'PARAMEDIC';
                  return false;
                };
                const isHighlighted = providerLevel !== 'ALL' && levelIncludes(effectiveProviderLevel, providerLevel);
                // Only show provider badge for header sections, not for every section with a provider level
                const showProviderBadge = section.type === 'header' && effectiveProviderLevel !== 'ALL';
                const isPearls = effectiveProviderLevel === 'PEARLS';

                const providerColors = effectiveProviderLevel !== 'ALL' ? getProviderLevelColors(effectiveProviderLevel) : [];

                return (
                  <div
                    key={sectionIndex}
                    ref={(el) => {
                      if (effectiveProviderLevel !== 'ALL') {
                        setRef(effectiveProviderLevel, el);
                      }
                    }}
                    className={`
                      transition-all duration-300 rounded-lg relative
                      ${effectiveProviderLevel !== 'ALL' ? 'p-4 mb-4' : ''}
                      ${effectiveProviderLevel !== 'ALL' ? 'pl-6' : ''}
                      ${isHighlighted && isPearls ? 'bg-amber-50 dark:bg-amber-900/20 shadow-md' : ''}
                      ${isHighlighted && !isPearls && effectiveProviderLevel !== 'ALL' ? 'bg-blue-50 dark:bg-blue-900/20 shadow-md' : ''}
                    `}
                  >
                    {/* Render multiple color bars for combined provider levels */}
                    {providerColors.length > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 flex rounded-l-lg overflow-hidden">
                        {providerColors.map((color, index) => (
                          <div
                            key={index}
                            className={`w-1 ${color}`}
                          />
                        ))}
                      </div>
                    )}
                    {/* Provider level header badge */}
                    {showProviderBadge && (
                      <div className="mb-3">
                        <h3 className={`inline-block px-3 py-1.5 text-sm font-bold rounded-md shadow-sm ${
                          effectiveProviderLevel === 'PEARLS'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'
                            : effectiveProviderLevel === 'EMT'
                            ? 'bg-gradient-to-r from-green-600 to-green-500 text-white'
                            : effectiveProviderLevel === 'ADVANCED_EMT'
                            ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 text-gray-900'
                            : effectiveProviderLevel === 'PARAMEDIC'
                            ? 'bg-gradient-to-r from-red-600 to-red-500 text-white'
                            : effectiveProviderLevel === 'EMT_ADVANCED_EMT'
                            ? 'bg-gradient-to-r from-green-600 to-yellow-500 text-white'
                            : effectiveProviderLevel === 'ADVANCED_EMT_PARAMEDIC'
                            ? 'bg-gradient-to-r from-yellow-500 to-red-500 text-white'
                            : effectiveProviderLevel === 'EMT_ADVANCED_EMT_PARAMEDIC'
                            ? 'bg-gradient-to-r from-green-600 to-red-500 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                        }`}>
                          {getProviderLevelDisplay(effectiveProviderLevel, section.pearlsTitle)}
                        </h3>
                      </div>
                    )}

                    {/* Render diagram if present */}
                    {mermaidContent && (
                      <MermaidDiagram
                        content={mermaidContent}
                        id={`${page.pageId}-section-${sectionIndex}`}
                      />
                    )}

                    {/* Render remaining HTML content with icons */}
                    {/* Skip rendering HTML for provider level headers since we show the styled badge instead */}
                    {cleanHtml && !(section.type === 'header' && effectiveProviderLevel !== 'ALL') && (
                      <div>{renderProtocolHtml(cleanHtml)}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {page.jpgReference && (
              <div className="mt-4">
                <PhotoView src={page.jpgReference}>
                  <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    View Original Page {page.pageNumber}
                  </button>
                </PhotoView>
              </div>
            )}

            {pageIndex < protocol.pages.length - 1 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"></div>
            )}
          </div>
        ))}
      </div>

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
