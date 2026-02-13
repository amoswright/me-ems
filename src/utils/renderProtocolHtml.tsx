import { ProtocolIcon } from '@/components/ProtocolIcon';
import parse, { Element } from 'html-react-parser';
import type { HTMLReactParserOptions } from 'html-react-parser';

/**
 * Renders protocol HTML, replacing custom <protocol-icon> tags with React components
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
      // Return undefined to keep default behavior for other elements
      return undefined;
    },
  };

  return parse(html, options);
}
