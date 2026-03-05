import type { SearchResult } from '../hooks/useSearch';

/**
 * Extracts a contextual snippet around the match location
 * @param result Search result with match information
 * @param maxLength Maximum snippet length (default: 200)
 * @returns React node with highlighted match in context
 */
export function getContextSnippet(
  result: SearchResult,
  maxLength: number = 200
): React.ReactNode {
  const matches = result.matches;
  if (!matches || matches.length === 0) {
    // No matches, return truncated content
    const truncated = result.item.content.substring(0, maxLength);
    return truncated + (result.item.content.length > maxLength ? '...' : '');
  }

  const fullText = result.item.content;
  let matchStart: number = -1;
  let matchEnd: number = -1;

  // Strategy: Collect all possible search terms from matches, then find the first one in content
  const searchTerms: string[] = [];

  // Collect terms from all matches
  matches.forEach(match => {
    if (!match.indices || match.indices.length === 0 || !match.value) return;

    const [start, end] = match.indices[0];

    if (match.key === 'title' && typeof match.value === 'string') {
      const term = match.value.substring(start, end + 1);
      if (term.length >= 4) searchTerms.push(term);
    } else if (match.key === 'keywords') {
      // For keywords, extract the actual matched keyword
      if (typeof match.value === 'string') {
        const term = match.value.substring(start, end + 1);
        if (term.length >= 4) searchTerms.push(term);
      } else if (Array.isArray(match.value)) {
        // Search through keyword array for matches
        (match.value as string[]).forEach(kw => {
          if (typeof kw === 'string' && kw.length >= 4) {
            searchTerms.push(kw);
          }
        });
      }
    }
  });

  // Search for each term in content, use the first one found
  for (const term of searchTerms) {
    const searchPos = fullText.toLowerCase().indexOf(term.toLowerCase());
    if (searchPos >= 0) {
      matchStart = searchPos;
      matchEnd = searchPos + term.length - 1;
      break;
    }
  }

  // If still no match, use content match directly from Fuse
  if (matchStart === -1) {
    const contentMatch = matches.find(m => m.key === 'content');
    if (contentMatch && contentMatch.indices && contentMatch.indices.length > 0) {
      [matchStart, matchEnd] = contentMatch.indices[0];
    }
  }

  // If we still don't have a match, fall back to beginning of content
  if (matchStart === -1 || matchEnd === -1) {
    const truncated = fullText.substring(0, maxLength);
    return truncated + (fullText.length > maxLength ? '...' : '');
  }

  // Validate indices are within bounds
  if (matchStart < 0 || matchEnd >= fullText.length || matchStart > matchEnd) {
    const truncated = result.item.content.substring(0, maxLength);
    return truncated + (result.item.content.length > maxLength ? '...' : '');
  }

  // Calculate context window (show text before and after the match)
  const matchLength = matchEnd - matchStart + 1;
  const remainingSpace = Math.max(0, maxLength - matchLength);
  const beforeChars = Math.floor(remainingSpace * 0.4); // 40% before
  const afterChars = Math.ceil(remainingSpace * 0.6); // 60% after

  const contextStart = Math.max(0, matchStart - beforeChars);
  const contextEnd = Math.min(fullText.length, matchEnd + 1 + afterChars);

  const prefix = contextStart > 0 ? '...' : '';
  const suffix = contextEnd < fullText.length ? '...' : '';

  const beforeMatch = fullText.substring(contextStart, matchStart);
  const matchText = fullText.substring(matchStart, matchEnd + 1);
  const afterMatch = fullText.substring(matchEnd + 1, contextEnd);

  return (
    <>
      {prefix}
      {beforeMatch}
      <mark className="bg-yellow-200 dark:bg-yellow-600 font-semibold px-0.5 rounded">
        {matchText}
      </mark>
      {afterMatch}
      {suffix}
    </>
  );
}

/**
 * Highlights matches in text (for titles)
 * @param text Text to highlight
 * @param matches Match information from Fuse.js
 * @returns React node with highlighted matches
 */
export function highlightMatches(text: string, matches?: readonly any[]): React.ReactNode {
  if (!matches || matches.length === 0) {
    return text;
  }

  // Find match in title or content
  const match = matches.find(m => m.key === 'title' || m.key === 'content');
  if (!match || !match.indices || match.indices.length === 0) {
    return text;
  }

  const [start, end] = match.indices[0];
  return (
    <>
      {text.substring(0, start)}
      <mark className="bg-yellow-200 dark:bg-yellow-600 font-semibold px-0.5 rounded">
        {text.substring(start, end + 1)}
      </mark>
      {text.substring(end + 1)}
    </>
  );
}
