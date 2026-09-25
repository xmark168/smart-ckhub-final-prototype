import type { Role } from '../store/types'

/** Account sees records they own or created; BODs, Administrator and Partner screens are not limited here. */
export function inScope(role: Role, account: string, record: { owner: string; createdBy?: string }): boolean {
  return role !== 'account' || record.owner === account || record.createdBy === account
}
