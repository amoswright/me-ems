/**
 * Detects if HTML content contains a Mermaid diagram
 */
export function hasMermaidContent(html: string): boolean {
  return html.includes('<mermaid>') || html.includes('&lt;mermaid&gt;');
}

/**
 * Extracts Mermaid diagram content from HTML
 * Handles both actual <mermaid> tags and HTML-encoded &lt;mermaid&gt; tags
 */
export function extractMermaidContent(html: string): string | null {
  // Try actual <mermaid> tags first
  let match = html.match(/<mermaid>([\s\S]*?)<\/mermaid>/);
  if (match) {
    // Decode HTML entities
    let decoded = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // Wrap all node labels in quotes to handle special characters like parentheses
    // Match patterns like A[label] and wrap label in quotes: A["label"]
    // This regex matches square bracket content that isn't already quoted
    decoded = decoded.replace(/\[(?!")([^\]]+)\]/g, (match, label) => {
      // If label doesn't start with a quote, wrap it
      return `["${label}"]`;
    });

    return decoded.trim();
  }

  // Try HTML-encoded tags
  match = html.match(/&lt;mermaid&gt;([\s\S]*?)&lt;\/mermaid&gt;/);
  if (match) {
    // Decode HTML entities
    let decoded = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // Wrap all node labels in quotes
    decoded = decoded.replace(/\[(?!")([^\]]+)\]/g, (match, label) => {
      return `["${label}"]`;
    });

    return decoded.trim();
  }

  return null;
}

/**
 * Removes Mermaid tags from HTML content
 * Used to clean up the HTML after rendering Mermaid separately
 */
export function removeMermaidTags(html: string): string {
  let cleaned = html.replace(/<mermaid>[\s\S]*?<\/mermaid>/g, '');
  cleaned = cleaned.replace(/&lt;mermaid&gt;[\s\S]*?&lt;\/mermaid&gt;/g, '');
  return cleaned.trim();
}
