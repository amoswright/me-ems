import React from 'react';
import type { Protocol } from '@/types/protocol';
import { renderProtocolHtml } from '@/utils/renderProtocolHtml';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { extractMermaidContent } from '@/utils/parseMermaid';

// ─── Route icon detection ──────────────────────────────────────────────────

const ROUTE_ICONS = [
  { key: 'IM',  file: '/assets/route-icons/im-thigh.svg',      pattern: /\bIM\b/ },
  { key: 'IV',  file: '/assets/route-icons/iv-arm.svg',        pattern: /\bIV\b/ },
  { key: 'IO',  file: '/assets/route-icons/io-lower-leg.svg',  pattern: /\bIO\b/ },
  { key: 'SL',  file: '/assets/route-icons/sl-sublingual.svg', pattern: /\bSL\b/ },
  { key: 'IN',  file: '/assets/route-icons/in-nasal.svg',      pattern: /\bIN\b/ },
  { key: 'PO',  file: '/assets/route-icons/po-oral.svg',       pattern: /\bPO\b/ },
  { key: 'Neb', file: '/assets/route-icons/neb-mask.svg',      pattern: /\bneb/i },
] as const;

type RouteIcon = typeof ROUTE_ICONS[number];

function detectRoutes(html: string): RouteIcon[] {
  const stripped = html.replace(/<[^>]+>/g, ' ');
  return ROUTE_ICONS.filter(r => r.pattern.test(stripped));
}

// ─── List item parsing ─────────────────────────────────────────────────────

function getActionText(liHtml: string): string {
  // Find where the first nested list starts (new structure) or first <br> (old fallback)
  const olIdx = liHtml.search(/<ol\b/i);
  const ulIdx = liHtml.search(/<ul\b/i);
  const brIdx = liHtml.search(/<br\s*\/?>/i);
  const candidates = [olIdx, ulIdx, brIdx].filter(i => i >= 0);
  const cutIdx = candidates.length > 0 ? Math.min(...candidates) : -1;
  const slice = cutIdx >= 0 ? liHtml.slice(0, cutIdx) : liHtml;
  const text = slice
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
  return text.length > 80 ? text.slice(0, 77) + '…' : text;
}

function getDetailHtml(liHtml: string): string {
  // New structure: nested <ol type="a"> or <ul>
  const olIdx = liHtml.search(/<ol\b/i);
  const ulIdx = liHtml.search(/<ul\b/i);
  const candidates = [olIdx, ulIdx].filter(i => i >= 0);
  if (candidates.length > 0) return liHtml.slice(Math.min(...candidates));
  // Fallback: old-style <br> sub-items (shouldn't occur after the fix, but be safe)
  const brIdx = liHtml.search(/<br\s*\/?>/i);
  return brIdx >= 0 ? liHtml.slice(brIdx) : '';
}

// ─── Provider level styles ─────────────────────────────────────────────────

export const LEVEL_STYLES: Record<string, { border: string; iconBg: string; pillGrad: string; label: string }> = {
  EMT:                         { border: 'border-l-green-500',  iconBg: 'bg-green-50 dark:bg-green-900/20',   pillGrad: 'from-green-700 to-green-500 text-white',         label: 'EMT' },
  ADVANCED_EMT:                { border: 'border-l-yellow-500', iconBg: 'bg-yellow-50 dark:bg-yellow-900/20', pillGrad: 'from-yellow-600 to-yellow-400 text-gray-900',    label: 'Advanced EMT' },
  PARAMEDIC:                   { border: 'border-l-red-500',    iconBg: 'bg-red-50 dark:bg-red-900/20',       pillGrad: 'from-red-700 to-red-500 text-white',             label: 'Paramedic' },
  EMT_ADVANCED_EMT:            { border: 'border-l-green-400',  iconBg: 'bg-green-50 dark:bg-green-900/20',   pillGrad: 'from-green-600 to-yellow-500 text-white',        label: 'EMT / Advanced EMT' },
  ADVANCED_EMT_PARAMEDIC:      { border: 'border-l-yellow-400', iconBg: 'bg-yellow-50 dark:bg-yellow-900/20', pillGrad: 'from-yellow-500 to-red-500 text-white',          label: 'Advanced EMT / Paramedic' },
  EMT_ADVANCED_EMT_PARAMEDIC:  { border: 'border-l-green-400',  iconBg: 'bg-green-50 dark:bg-green-900/20',   pillGrad: 'from-green-600 to-red-500 text-white',           label: 'EMT / Advanced EMT / Paramedic' },
  PEARLS:                      { border: 'border-l-amber-500',  iconBg: 'bg-amber-50 dark:bg-amber-900/20',   pillGrad: 'from-amber-500 to-yellow-400 text-white',        label: 'PEARLS' },
  ALL:                         { border: 'border-l-gray-200',   iconBg: 'bg-gray-50 dark:bg-gray-800',        pillGrad: '',                                              label: '' },
};

function iconStroke(level: string): string {
  if (level === 'EMT' || level.startsWith('EMT_')) return '#16a34a';
  if (level.startsWith('ADVANCED_EMT')) return '#ca8a04';
  if (level === 'PARAMEDIC') return '#dc2626';
  if (level === 'PEARLS') return '#f59e0b';
  return '#94a3b8';
}

// ─── Generic step icons ────────────────────────────────────────────────────

type IconType = 'airway' | 'cardiac' | 'radio' | 'decision' | 'default';

function detectIconType(html: string): IconType {
  const t = html.toLowerCase();
  if (/airway|intub|ventilat|bvm|cpap|bipap|suction/.test(t)) return 'airway';
  if (/cardiac|ecg|ekg|monitor|defibril|compressi|cpr|pulse/.test(t)) return 'cardiac';
  if (/\bals\b|request.*als|contact.*olmc|notify.*olmc|olmc|dispatch/.test(t)) return 'radio';
  if (/\bif\s+(shock|wheezing|present|yes|no)\b|decision/.test(t)) return 'decision';
  return 'default';
}

function GenericStepIcon({ level, html }: { level: string; html: string }) {
  const s = LEVEL_STYLES[level] ?? LEVEL_STYLES.ALL;
  const stroke = iconStroke(level);
  const type = detectIconType(html);

  return (
    <div
      className={`flex items-center justify-center rounded-xl flex-shrink-0 ${s.iconBg}`}
      style={{ width: 52, height: 52 }}
    >
      {type === 'airway' && (
        <svg viewBox="0 0 28 28" width={28} height={28} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3v5"/>
          <path d="M9 10C6.5 11.5 5 14.5 6 18c.7 2 2.8 3.2 4.8 2.8"/>
          <path d="M19 10c2.5 1.5 4 4.5 3 8-.7 2-2.8 3.2-4.8 2.8"/>
          <ellipse cx="14" cy="9" rx="2.5" ry="1.8"/>
          <path d="M14 14v4"/>
        </svg>
      )}
      {type === 'cardiac' && (
        <svg viewBox="0 0 28 28" width={28} height={28} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 14 6 14 8 8 11 20 13.5 11 16 16 18 13 23 13 26 13"/>
        </svg>
      )}
      {type === 'radio' && (
        <svg viewBox="0 0 28 28" width={28} height={28} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="8" width="18" height="13" rx="2"/>
          <path d="M8 8V6a1 1 0 011-1h10a1 1 0 011 1v2"/>
          <circle cx="14" cy="14.5" r="2.5"/>
          <path d="M10 4.5C8 5.5 7 7 7 9"/>
          <path d="M18 4.5C20 5.5 21 7 21 9"/>
        </svg>
      )}
      {type === 'decision' && (
        <svg viewBox="0 0 28 28" width={28} height={28} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4v7"/>
          <path d="M10 14l-4 4"/>
          <path d="M18 14l4 4"/>
          <circle cx="6" cy="21" r="2.5"/>
          <circle cx="22" cy="21" r="2.5"/>
          <circle cx="14" cy="9" r="2.5"/>
        </svg>
      )}
      {type === 'default' && (
        <svg viewBox="0 0 28 28" width={28} height={28} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="20" height="20" rx="3"/>
          <line x1="8" y1="10" x2="20" y2="10"/>
          <line x1="8" y1="14" x2="20" y2="14"/>
          <line x1="8" y1="18" x2="15" y2="18"/>
        </svg>
      )}
    </div>
  );
}

// ─── Route icon stack ──────────────────────────────────────────────────────

function RouteIconStack({ routes }: { routes: RouteIcon[] }) {
  if (routes.length === 1) {
    return (
      <img
        src={routes[0].file}
        alt={routes[0].key}
        style={{ width: 64, height: 64, flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      {routes.map(r => (
        <img
          key={r.key}
          src={r.file}
          alt={r.key}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      ))}
    </div>
  );
}

// ─── Step card ─────────────────────────────────────────────────────────────

function StepCard({ num, liHtml, level }: { num: number; liHtml: string; level: string }) {
  const routes = detectRoutes(liHtml);
  const action = getActionText(liHtml);
  const detailHtml = getDetailHtml(liHtml);
  const s = LEVEL_STYLES[level] ?? LEVEL_STYLES.ALL;

  return (
    <div className={`flex items-start gap-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 ${s.border} p-3 mb-2 relative`}>
      <span className="absolute top-2 right-3 text-[10px] font-bold text-gray-400 opacity-40 select-none">{num}</span>
      {routes.length > 0
        ? <RouteIconStack routes={routes} />
        : <GenericStepIcon level={level} html={liHtml} />
      }
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-bold text-gray-900 dark:text-white text-[15px] leading-snug">{action}</p>
        {detailHtml && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {renderProtocolHtml(detailHtml)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Level divider ─────────────────────────────────────────────────────────

function LevelDivider({ level }: { level: string }) {
  const s = LEVEL_STYLES[level] ?? LEVEL_STYLES.ALL;
  if (!s.pillGrad) return null;
  return (
    <div className="flex items-center gap-3 my-5 first:mt-0">
      <span className={`bg-gradient-to-r ${s.pillGrad} text-[10px] font-extrabold tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-sm whitespace-nowrap`}>
        {s.label}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

// ─── Info card (for content/pearls sections) ───────────────────────────────

function InfoCard({ html, level }: { html: string; level: string }) {
  const s = LEVEL_STYLES[level] ?? LEVEL_STYLES.ALL;
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 ${s.border} p-4 mb-3`}>
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {renderProtocolHtml(html)}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function ProtocolSummaryView({ protocol }: { protocol: Protocol }) {
  // Group consecutive steps by provider level
  type StepGroup = { level: string; steps: typeof protocol.steps; showDivider: boolean };
  const stepGroups = protocol.steps.reduce<StepGroup[]>((acc, step) => {
    const last = acc[acc.length - 1];
    if (last && last.level === step.providerLevel) {
      last.steps.push(step);
      return acc;
    }
    // Show divider when level changes or on first group
    const showDivider = acc.length === 0 || step.providerLevel !== acc[acc.length - 1]?.level;
    acc.push({ level: step.providerLevel, steps: [step], showDivider });
    return acc;
  }, []);

  return (
    <div>
      {/* Intro content */}
      {protocol.intro.map((item, i) => {
        if (item.type === 'mermaid') {
          const content = extractMermaidContent(item.html);
          return content
            ? <div key={i} className="mb-4"><MermaidDiagram content={content} id={`intro-${i}`} /></div>
            : null;
        }
        return <InfoCard key={i} html={item.html} level={item.providerLevel} />;
      })}

      {/* Steps grouped by provider level */}
      {stepGroups.map((group, gi) => (
        <React.Fragment key={gi}>
          {group.showDivider && <LevelDivider level={group.level} />}
          {group.steps.map(step => (
            <StepCard key={step.num} num={step.num} liHtml={step.html} level={group.level} />
          ))}
        </React.Fragment>
      ))}

      {/* PEARLS sections */}
      {protocol.pearls.map((pearl, i) => (
        <div key={i} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[10px] font-extrabold tracking-widest uppercase px-3 py-1.5 rounded-xl">
              {pearl.title ? `PEARLS: ${pearl.title}` : 'PEARLS'}
            </span>
          </div>
          <div className="space-y-2">
            {pearl.html.map((h, j) => (
              <InfoCard key={j} html={h} level="PEARLS" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
