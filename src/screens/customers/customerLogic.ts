import { CURRENT_ACCOUNT } from '../../lib/format'
import type { Customer } from '../../store/types'

export function addCustomerActivity(customer: Customer, title: string, detail: string, icon = 'clock-3') {
  customer.activities = [{ title, detail, icon, time: 'Vừa xong' }, ...customer.activities].slice(0, 10)
}

export function canStopCustomerProject(role: string, customer: Customer): boolean {
  return role === 'account' && (customer.owner === CURRENT_ACCOUNT || customer.createdBy === CURRENT_ACCOUNT)
}
