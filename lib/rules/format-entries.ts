// 5e.tools `entries` arrays mix plain strings with nested objects
// (e.g. { type: 'entries', name: '...', entries: [...] }, { type: 'list', items: [...] }).
// Flatten them into plain paragraphs for display in the rule drawer.
export function flattenEntries(entries: unknown, out: string[] = []): string[] {
  if (entries == null) return out
  if (typeof entries === 'string') {
    out.push(entries)
    return out
  }
  if (Array.isArray(entries)) {
    for (const e of entries) flattenEntries(e, out)
    return out
  }
  if (typeof entries === 'object') {
    const obj = entries as Record<string, unknown>
    if (typeof obj.name === 'string') out.push(`**${obj.name}.**`)
    if ('entries' in obj) flattenEntries(obj.entries, out)
    if ('items' in obj) flattenEntries(obj.items, out)
    return out
  }
  return out
}
