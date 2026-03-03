import React from 'react';
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
 * Splits <li> children at <br> boundaries into segments, then applies consistent
 * indentation to each segment based on its leading marker:
 *   - letter markers (a., b., c.)      → ml-8
 *   - roman numeral markers (i., ii.)  → ml-16
 *   - number sub-items (1., 2., 3.)    → ml-24
 *
 * Wraps the ENTIRE segment (text + inline elements like <strong>) inside the
 * indented div, so bold/italic content stays with its marker line.
 */
function processLiChildren(
  children: DOMNode[],
  options: HTMLReactParserOptions
): React.ReactNode[] {
  // Split children into segments at <br> boundaries
  const segments: DOMNode[][] = [[]];
  for (const child of children) {
    if (child.type === 'tag' && (child as Element).name === 'br') {
      segments.push([]);
    } else {
      segments[segments.length - 1].push(child);
    }
  }

  const result: React.ReactNode[] = [];

  segments.forEach((segment, segIndex) => {
    // Skip empty trailing segments
    if (segment.length === 0) return;

    // Check first text node for a sub-item marker
    const firstText = segment.find(n => n.type === 'text') as Text | undefined;
    const rawText = firstText?.data ?? '';
    const trimmed = rawText.trimStart();

    // Roman numerals first (since 'i' is also a letter)
    const romanMatch = trimmed.match(/^([ivx]{1,6})\.\s*/i);
    const letterMatch = !romanMatch && trimmed.match(/^([a-z])\.\s*/i);
    const numMatch = !romanMatch && !letterMatch && trimmed.match(/^(\d+)\.\s*/);
    const markerMatch = romanMatch || letterMatch || numMatch;

    if (markerMatch && firstText) {
      const marker = markerMatch[1];
      // Text after the marker in the first text node
      const leadingWhitespace = rawText.length - trimmed.length;
      const restText = rawText.slice(leadingWhitespace + markerMatch[0].length);
      // All nodes in this segment except the first text node
      const restNodes = segment.filter(n => n !== firstText);

      const indent = romanMatch ? 'ml-16' : letterMatch ? 'ml-8' : 'ml-24';

      result.push(
        <div key={`seg-${segIndex}`} className={`${indent} mt-1`}>
          <span className="font-semibold">{marker}.</span>{' '}
          {linkifyProtocolRefs(restText, `seg-${segIndex}`)}
          {domToReact(restNodes as DOMNode[], options)}
        </div>
      );
    } else {
      // No marker — first segment is the main item text, later ones are continuations
      if (segIndex > 0) result.push(<br key={`br-${segIndex}`} />);
      result.push(
        <React.Fragment key={`seg-${segIndex}`}>
          {domToReact(segment as DOMNode[], options)}
        </React.Fragment>
      );
    }
  });

  return result;
}

/**
 * Renders protocol HTML, replacing custom <protocol-icon> tags with React components,
 * adding proper indentation for nested list items, and linkifying protocol references.
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

      // Process <li> elements that contain sub-item markers after a <br>
      if (domNode instanceof Element && domNode.name === 'li') {
        const hasSubItems = domNode.children.some(child => {
          if (child.type !== 'text') return false;
          const trimmed = (child as Text).data.trimStart();
          return /^([ivx]{1,6}|[a-z]|\d+)\.\s/i.test(trimmed);
        });

        if (hasSubItems) {
          return (
            <li>
              {processLiChildren(domNode.children as DOMNode[], options)}
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
