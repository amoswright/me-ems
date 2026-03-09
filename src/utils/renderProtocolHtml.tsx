import React from 'react';
import { ProtocolIcon } from '@/components/ProtocolIcon';
import { Link } from 'react-router-dom';
import parse, { Element, Text, domToReact } from 'html-react-parser';
import type { HTMLReactParserOptions, DOMNode } from 'html-react-parser';
import protocolPageMap from '../../public/data/protocol-page-map.json';

const pageMap = protocolPageMap as Record<string, string>;

// List styles — use inline style for list-style-type to bypass Tailwind preflight reset
const OL_STYLE: Record<string, React.CSSProperties> = {
  a:      { listStyleType: 'lower-alpha' },
  i:      { listStyleType: 'lower-roman' },
  nested: { listStyleType: 'decimal' },
  top:    { listStyleType: 'decimal' },
};
const OL_CLASS: Record<string, string> = {
  a:      'pl-6 mt-1 space-y-1',
  i:      'pl-8 mt-1 space-y-1',
  nested: 'pl-6 mt-1 space-y-1',
  top:    'pl-5 space-y-2 leading-relaxed',
};

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
 * Renders protocol HTML, replacing custom <protocol-icon> tags with React components,
 * styling nested semantic lists, and linkifying protocol references.
 *
 * Lists are now properly nested in the source data:
 *   <ol>            → top-level numbered steps
 *   <ol type="a">   → alphabetical sub-items
 *   <ol type="i">   → roman numeral sub-sub-items
 *   <ol> (nested)   → numbered sub-sub-sub-items
 */
export function renderProtocolHtml(html: string) {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      // Replace <protocol-icon> with React component
      if (domNode instanceof Element && domNode.name === 'protocol-icon') {
        const iconName = domNode.attribs?.name;
        if (iconName) {
          return <ProtocolIcon name={iconName} className="mx-1" />;
        }
      }

      // Style <ol> elements — use inline style for list-style-type so Tailwind
      // preflight reset doesn't suppress the bullet character
      if (domNode instanceof Element && domNode.name === 'ol') {
        const type = domNode.attribs?.type;
        const start = domNode.attribs?.start;
        const isNested = domNode.parent && (domNode.parent as Element).name === 'li';
        const key = type === 'a' ? 'a' : type === 'i' ? 'i' : isNested ? 'nested' : 'top';
        const props: React.OlHTMLAttributes<HTMLOListElement> = {
          className: OL_CLASS[key],
          style: OL_STYLE[key],
        };
        if (start) props.start = parseInt(start, 10);
        return <ol {...props}>{domToReact(domNode.children as DOMNode[], options)}</ol>;
      }

      // Style <ul> elements
      if (domNode instanceof Element && domNode.name === 'ul') {
        const isNested = domNode.parent && (domNode.parent as Element).name === 'li';
        return (
          <ul
            className={isNested ? 'pl-6 mt-1 space-y-1' : 'pl-5 space-y-2 leading-relaxed'}
            style={{ listStyleType: 'disc' }}
          >
            {domToReact(domNode.children as DOMNode[], options)}
          </ul>
        );
      }

      // Linkify protocol references in text nodes
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
