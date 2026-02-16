import { ProtocolIcon } from '@/components/ProtocolIcon';
import parse, { Element, Text, domToReact } from 'html-react-parser';
import type { HTMLReactParserOptions, DOMNode } from 'html-react-parser';

/**
 * Processes text content to add indentation for nested list items (a., b., c., etc.)
 */
function processNestedListText(text: string): React.ReactNode {
  // Split by <br> or newlines to handle sub-items
  const lines = text.split(/(<br\s*\/?>|\n)/i);
  const processedLines: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    if (line.match(/<br\s*\/?>/i) || line === '\n') {
      processedLines.push(<br key={`br-${index}`} />);
    } else if (line.trim()) {
      // Check if line starts with a letter marker (a., b., c., etc.)
      const letterMatch = line.match(/^\s*([a-z])\.\s+(.+)/i);
      if (letterMatch) {
        processedLines.push(
          <div key={`nested-${index}`} className="ml-8 mt-1">
            <span className="font-semibold">{letterMatch[1]}.</span> {letterMatch[2]}
          </div>
        );
      } else {
        processedLines.push(line);
      }
    }
  });

  return processedLines.length > 0 ? processedLines : text;
}

/**
 * Renders protocol HTML, replacing custom <protocol-icon> tags with React components
 * and adding proper indentation for nested list items
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
        // Check if this li contains text with letter markers (a., b., c.)
        const innerHTML = domNode.children
          .map((child) => {
            if (child.type === 'text') {
              return (child as Text).data;
            } else if (child.type === 'tag') {
              return `<${(child as Element).name}>`;
            }
            return '';
          })
          .join('');

        if (innerHTML.match(/[a-z]\.\s+/i)) {
          // This li has nested items, process it specially
          return (
            <li key={domNode.attribs?.key}>
              {domNode.children.map((child, idx) => {
                if (child.type === 'text') {
                  return processNestedListText((child as Text).data);
                }
                return domToReact([child] as DOMNode[], options);
              })}
            </li>
          );
        }
      }

      // Return undefined to keep default behavior for other elements
      return undefined;
    },
  };

  return parse(html, options);
}
