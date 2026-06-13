import { useMemo, type ReactNode } from 'react'
import { RuleLink } from '@/components/rules/rule-link'

// Matches the `[type]name[/type]` convention produced by
// lib/import/normalize.ts (see dnd-platform-north-star.md "Tag Parser Architecture").
const TAG_RE = /\[(\w+)\]([^[]+)\[\/\1\]/g

/**
 * Splits `text` on `[type]name[/type]` tags and renders each match as a
 * <RuleLink>. Plain text passes through unchanged. Returns an array of
 * strings/elements suitable for JSX children.
 */
export function useRuleInliner(text: string): ReactNode[] {
  return useMemo(() => {
    if (!text || !text.includes('[')) return [text]

    const nodes: ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    let key = 0

    TAG_RE.lastIndex = 0
    while ((match = TAG_RE.exec(text)) !== null) {
      const [full, type, name] = match
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index))
      }
      nodes.push(<RuleLink key={key++} type={type} name={name} />)
      lastIndex = match.index + full.length
    }

    if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
    return nodes
  }, [text])
}
