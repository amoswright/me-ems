import { ProtocolIcon } from '@/components/ProtocolIcon';
import { Link } from 'react-router-dom';
import parse, { Element, Text, domToReact } from 'html-react-parser';
import type { HTMLReactParserOptions, DOMNode } from 'html-react-parser';
import protocolPageMap from '../../public/data/protocol-page-map.json';

const pageMap = protocolPageMap as Record<string, string>;

// Matches "Blue 9", "Gold 3", "Grey 15", etc.
const PROTOCOL_REF_RE = /(Blue|Gold|Red|Green|Grey|Brown|Orange|Purple|Lavender|Pink|Yellow)\s+\d+/g;

function linkifyProtocolRefs(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(PROTOCOL_REF_RE.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const ref = match[0];
    const protocolId = pageMap[ref];
    if (protocolId) {
      parts.push(
        <Link
          key={`${keyPrefix}-${match.index}`}
          to={`/protocol/${protocolId}`}
          className="protocol-ref-link"
          onClick={(e) => e.stopPropagation()}
        >
          {ref}
        </Link>
      );
    } else {
      parts.push(ref);
    }
    lastIndex = match.index + ref.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Processes text content to add indentation for nested list items.
 * Three levels:
 *   - letter markers (a., b., c.)      → ml-8
 *   - roman numeral markers (i., ii.)  → ml-16
 *   - number sub-items (1., 2., 3.)    → ml-24
 */
function processNestedListText(text: string): React.ReactNode {
  const lines = text.split(/(<br\s*\/?>|\n)/i);
  const processedLines: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.match(/<br\s*\/?>/i) || line === '\n') {
      processedLines.push(<br key={`br-${index}`} />);
    } else if (line.trim()) {
      // Roman numerals checked first since 'i' is both a letter and roman numeral
      // [ivx]+ covers i, ii, iii, iv, v, vi, vii, viii, ix, x, xi, etc.
      const romanMatch = line.match(/^\s*([ivx]{1,6})\.\s+(.+)/i);
      const letterMatch = !romanMatch && line.match(/^\s*([a-z])\.\s+(.+)/i);
      const numMatch = !romanMatch && !letterMatch && line.match(/^\s*(\d+)\.\s+(.+)/);

      if (romanMatch) {
        processedLines.push(
          <div key={`roman-${index}`} className="ml-16 mt-1">
            <span className="font-semibold">{romanMatch[1]}.</span>{' '}
            {linkifyProtocolRefs(romanMatch[2], `roman-${index}`)}
          </div>
        );
      } else if (letterMatch) {
        processedLines.push(
          <div key={`letter-${index}`} className="ml-8 mt-1">
            <span className="font-semibold">{letterMatch[1]}.</span>{' '}
            {linkifyProtocolRefs(letterMatch[2], `letter-${index}`)}
          </div>
        );
      } else if (numMatch) {
        processedLines.push(
          <div key={`num-${index}`} className="ml-24 mt-1">
            <span className="font-semibold">{numMatch[1]}.</span>{' '}
            {linkifyProtocolRefs(numMatch[2], `num-${index}`)}
          </div>
        );
      } else {
        const linked = linkifyProtocolRefs(line, `line-${index}`);
        processedLines.push(
          linked.length === 1 && typeof linked[0] === 'string'
            ? line
            : <span key={`span-${index}`}>{linked}</span>
        );
      }
    }
  });

  return processedLines.length > 0 ? processedLines : text;
}

/**
 * Renders protocol HTML, replacing custom <protocol-icon> tags with React components,
 * adding proper indentation for nested list items, and linkifying protocol references.
 */
export function renderProtocolHtml(html: string) {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      // Check if this is a protocol-icon element
      if (domNode instanceof Element && domNode.name === 'protocol-icon') {
        const iconName = domNode.attribs?.name;
        if (iconName) {
          return <ProtocolIcon name={iconName} className="mx-1" />;
        }
      }

      // Process list items for nested sub-items
      if (domNode instanceof Element && domNode.name === 'li') {
        const innerHTML = domNode.children
          .map((child) => {
            if (child.type === 'text') return (child as Text).data;
            if (child.type === 'tag') return `<${(child as Element).name}>`;
            return '';
          })
          .join('');

        if (innerHTML.match(/[a-z]\.\s+/i)) {
          return (
            <li key={domNode.attribs?.key}>
              {domNode.children.map((child, _idx) => {
                if (child.type === 'text') {
                  return processNestedListText((child as Text).data);
                }
                return domToReact([child] as DOMNode[], options);
              })}
            </li>
          );
        }
      }

      // Linkify protocol references in all other text nodes
      if (domNode.type === 'text') {
        const data = (domNode as Text).data;
        if (!data?.trim()) return undefined;
        const linked = linkifyProtocolRefs(data, `t-${data.length}`);
        if (linked.length === 1 && typeof linked[0] === 'string') return undefined;
        return <>{linked}</>;
      }

      return undefined;
    },
  };

  return parse(html, options);
}
