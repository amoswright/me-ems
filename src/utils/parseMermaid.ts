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
    return match[1].trim();
  }

  // Try HTML-encoded tags
  match = html.match(/&lt;mermaid&gt;([\s\S]*?)&lt;\/mermaid&gt;/);
  if (match) {
    // Decode HTML entities in the content
    const decoded = match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
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
