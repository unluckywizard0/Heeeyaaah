'use client'

import { useState } from 'react'
import { RuleDrawer } from '@/components/rules/rule-drawer'
import { isLinkableRuleType, type RuleType } from '@/lib/rules/rule-tables'

interface RuleLinkProps {
  type: string
  name: string
}

// Renders a `[type]name[/type]` tag. Linkable types open a drawer with the
// resolved rules_* entry; unknown types render as plain text so unrecognized
// tags never break the surrounding sentence.
export function RuleLink({ type, name }: RuleLinkProps) {
  const [open, setOpen] = useState(false)

  if (!isLinkableRuleType(type)) return <>{name}</>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline decoration-dotted underline-offset-2 transition-colors hover:decoration-solid"
        style={{ color: 'var(--accent-gold)' }}
      >
        {name}
      </button>
      {open && <RuleDrawer type={type as RuleType} name={name} onClose={() => setOpen(false)} />}
    </>
  )
}
