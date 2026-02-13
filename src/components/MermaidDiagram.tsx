import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  content: string;
  id?: string;
}

export function MermaidDiagram({ content, id }: MermaidDiagramProps) {
  console.log('🎨 MermaidDiagram rendered with content:', content?.substring(0, 100));
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let mounted = true;

    const renderDiagram = async () => {
      console.log('🎨 renderDiagram called with content:', content?.substring(0, 100));
      if (!containerRef.current) {
        console.log('❌ containerRef.current is null');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Dynamically import mermaid
        console.log('📦 Importing mermaid...');
        const mermaid = (await import('mermaid')).default;
        console.log('✅ Mermaid imported successfully');

        // Initialize mermaid with theme-aware colors
        console.log('🎨 Initializing mermaid with theme:', isDarkMode ? 'dark' : 'light');
        if (isDarkMode) {
          // Dark mode theme
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontSize: 24,
            themeVariables: {
              fontSize: '24px',
              primaryColor: '#1e3a5f',
              primaryTextColor: '#ffffff',
              primaryBorderColor: '#60a5fa',
              lineColor: '#9ca3af',
              secondaryColor: '#1f2937',
              tertiaryColor: '#374151',
              background: 'transparent',
              mainBkg: '#1e3a5f',
              nodeBorder: '#60a5fa',
              clusterBkg: '#1f2937',
              clusterBorder: '#60a5fa',
              titleColor: '#ffffff',
              edgeLabelBackground: 'transparent',
              textColor: '#ffffff',
            },
            flowchart: {
              useMaxWidth: false,
              htmlLabels: true,
              curve: 'basis',
              padding: 15,
              nodeSpacing: 80,
              rankSpacing: 100,
            },
          });
        } else {
          // Light mode theme
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontSize: 24,
            themeVariables: {
              fontSize: '24px',
              primaryColor: '#e3f2fd',
              primaryTextColor: '#000000',
              primaryBorderColor: '#1976d2',
              lineColor: '#424242',
              secondaryColor: '#fff3e0',
              tertiaryColor: '#f3e5f5',
              background: 'transparent',
              mainBkg: '#e3f2fd',
              nodeBorder: '#1976d2',
              clusterBkg: '#ffffde',
              clusterBorder: '#aaaa33',
              titleColor: '#000000',
              edgeLabelBackground: 'transparent',
              textColor: '#000000',
            },
            flowchart: {
              useMaxWidth: false,
              htmlLabels: true,
              curve: 'basis',
              padding: 15,
              nodeSpacing: 80,
              rankSpacing: 100,
            },
          });
        }
        console.log('✅ Mermaid initialized successfully');

        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        console.log('🆔 Generated diagram ID:', diagramId);
        console.log('📝 Content to render (first 200 chars):', content.substring(0, 200));

        // Render the diagram
        console.log('🎨 Calling mermaid.render()...');
        const { svg } = await mermaid.render(diagramId, content);
        console.log('✅ mermaid.render() completed, SVG length:', svg.length);

        if (mounted && containerRef.current) {
          console.log('📄 Setting innerHTML with SVG...');
          containerRef.current.innerHTML = svg;
          console.log('✅ innerHTML set successfully');

          // Manipulate SVG for mobile readability
          console.log('🔧 Manipulating SVG for responsive display...');
          const svgElement = containerRef.current.querySelector('svg');
          if (svgElement) {
            // Keep viewBox for responsive scaling, but make SVG fit container width
            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', 'auto');
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
            console.log('✅ SVG manipulation complete');
          }

          console.log('✅ Setting isLoading to false');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ Mermaid rendering error:', err);
        console.error('❌ Error type:', typeof err);
        console.error('❌ Error instanceof Error:', err instanceof Error);
        if (err instanceof Error) {
          console.error('❌ Error message:', err.message);
          console.error('❌ Error stack:', err.stack);
        }
        console.error('❌ Content that failed:', content);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [content, id, isDarkMode]);

  return (
    <div className="my-4">
      {isLoading && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">Loading diagram...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200">
            Diagram Error
          </p>
          <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>
          <details className="mt-2">
            <summary className="text-xs cursor-pointer text-red-700 dark:text-red-400">
              Show diagram source
            </summary>
            <pre className="text-xs mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded overflow-x-auto">
              {content}
            </pre>
          </details>
        </div>
      )}

      <div
        ref={containerRef}
        className={`mermaid-diagram w-full overflow-x-auto ${isLoading || error ? 'hidden' : ''}`}
        style={{
          marginBottom: '2rem',
        }}
        aria-label="Protocol flowchart"
      />
    </div>
  );
}
