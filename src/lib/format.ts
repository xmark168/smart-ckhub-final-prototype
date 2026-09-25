/** Prototype runs on a fixed "today" so seeded due dates stay meaningful. */
export const TODAY = '2026-09-25'

export const ACCOUNTS = ['Tuyền', 'Nguyên', 'Hiền', 'Minh Anh', 'Hải']

export function money(value: number | string | undefined): string {
  return Number(value || 0).toLocaleString('vi-VN') + 'đ'
}

export function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0')
}

/** Date → dd.mm.yyyy */
export function formatDate(date: Date): string {
  return pad(date.getDate()) + '.' + pad(date.getMonth() + 1) + '.' + date.getFullYear()
}

/** yyyy-mm-dd → Date at local midnight. */
export function parseInput(value: string): Date {
  return new Date(value + 'T00:00:00')
}

/** yyyy-mm-dd → dd.mm.yyyy */
export function inputToDisplay(value: string): string {
  return value ? value.split('-').reverse().join('.') : ''
}

/** dd.mm.yyyy → yyyy-mm-dd */
export function displayToInput(value: string): string {
  if (!value) return ''
  const [day, month, year] = value.split('.')
  return year + '-' + month + '-' + day
}

/** End of a contract that starts on `start` and runs `cycles` monthly cycles. */
export function contractEnd(start: string, cycles: number): string {
  const date = parseInput(start)
  return formatDate(new Date(date.getFullYear(), date.getMonth() + Number(cycles), date.getDate() - 1))
}

/** Planned end of a one-month cycle starting on `start` (yyyy-mm-dd), as dd.mm.yyyy. */
export function cycleEnd(start: string): string {
  return contractEnd(start, 1)
}

export function addBusinessDays(start: string, days: number): string {
  const date = parseInput(start)
  let added = 0
  while (added < days) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) added++
  }
  return formatDate(date)
}

/** Lower-case, accents removed, spaces collapsed: "Cơm  Tấm" → "com tam". */
export function foldText(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Accent-insensitive search; every word of the query must appear. */
export function includesText(haystack: Array<string | number | undefined>, query: string): boolean {
  const text = foldText(haystack.join(' '))
  return foldText(query).split(' ').every((word) => text.includes(word))
}

export function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

export function pageSlice<T>(list: T[], page: number, size: number): { rows: T[]; page: number; pages: number; from: number; to: number } {
  const pages = Math.max(1, Math.ceil(list.length / size))
  const current = Math.min(Math.max(1, page), pages)
  const start = (current - 1) * size
  return { rows: list.slice(start, start + size), page: current, pages, from: list.length ? start + 1 : 0, to: Math.min(start + size, list.length) }
}

/** Date → yyyy-mm-dd (local). */
export function toIso(date: Date): string {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

export function addDaysIso(iso: string, days: number): string {
  const date = parseInput(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

/** Adds working days (Monday–Friday) to a yyyy-mm-dd date. */
export function addBusinessDaysIso(iso: string, days: number): string {
  const date = parseInput(iso)
  let added = 0
  while (added < days) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) added++
  }
  return toIso(date)
}

/** Same day `months` later, minus one day: the planned end of a cycle that starts on `iso`. */
export function periodEndIso(iso: string, months: number): string {
  const date = parseInput(iso)
  return toIso(new Date(date.getFullYear(), date.getMonth() + months, date.getDate() - 1))
}

/** Whole days from `from` to `to` (both yyyy-mm-dd); negative when `to` is earlier. */
export function diffDays(from: string, to: string): number {
  return Math.round((parseInput(to).getTime() - parseInput(from).getTime()) / 86400000)
}

/** yyyy-mm-dd → dd.mm (short form for tables). */
export function shortDate(iso: string): string {
  return iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) : ''
}

/** Unique-enough id for records created in the prototype. */
export function newId(prefix: string): string {
  return prefix + '-' + Date.now()
}
