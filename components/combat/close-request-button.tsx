'use client'

import { closeRollRequestAction } from '@/lib/actions/roll-requests'
import { Button } from '@/components/ui/button'

/** DM control to close an open roll request (KAN-49). */
export function CloseRequestButton({ requestId }: { requestId: string }) {
  return (
    <form action={async () => { await closeRollRequestAction(requestId) }}>
      <Button type="submit" variant="ghost">
        Close
      </Button>
    </form>
  )
}
