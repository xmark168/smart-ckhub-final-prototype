/**
 * Page-level "chế độ xem": a detail page sets a reason while the signed-in user may only view
 * it. Dialogs still open (to read details) but refuse to save; project mutations are ignored.
 */
let reason: string | null = null

export function setViewOnly(next: string | null): void {
  reason = next
}

export function viewOnlyReason(): string | null {
  return reason
}
