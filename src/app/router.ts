import { useSyncExternalStore } from 'react'
import type { ScreenId } from './context'

/**
 * Hash-based routing (`#/projects/project-7?page=2`). Hash URLs keep working when the built
 * dist/ is served from GitHub Pages or a plain folder, with no server rewrite rules.
 */

export const PATHS: Record<ScreenId, string> = {
  overview: '/overview',
  customers: '/customers',
  customerDetail: '/customers/:id',
  projects: '/projects',
  projectDetail: '/projects/:id',
  cycleWorkspace: '/projects/:id/cycle',
  contracts: '/contracts',
  posts: '/posts',
  shootings: '/shootings',
  tasks: '/tasks',
  partners: '/partners',
  partnerWork: '/my-work',
  partnerProject: '/my-projects',
  partnerSchedule: '/my-schedule',
  reviews: '/reviews',
  poc: '/admin',
  services: '/services',
  parameters: '/parameters',
  docs: '/docs',
  access: '/access',
  profile: '/profile',
  settings: '/settings',
}

export interface Route {
  screen: ScreenId
  id: string
  query: URLSearchParams
  /** Path + query, used to tie UI state (e.g. an open modal) to the page it was opened on. */
  key: string
}

/** `route` is null when the path matches no page (404). */
export interface Location {
  path: string
  route: Route | null
}

const ENTRIES = Object.entries(PATHS) as Array<[ScreenId, string]>

function matchPath(pattern: string, path: string): string | null {
  const want = pattern.split('/')
  const got = path.split('/')
  if (want.length !== got.length) return null
  let id = ''
  for (let index = 0; index < want.length; index++) {
    if (want[index] === ':id') id = decodeURIComponent(got[index])
    else if (want[index] !== got[index]) return null
  }
  return want.includes(':id') && !id ? null : id
}

export function parseHash(hash: string): Location {
  const raw = hash.replace(/^#/, '') || '/'
  const [pathPart, search = ''] = raw.split('?')
  const path = pathPart.replace(/\/+$/, '') || '/'
  for (const [screen, pattern] of ENTRIES) {
    const id = matchPath(pattern, path)
    if (id !== null) return { path, route: { screen, id, query: new URLSearchParams(search), key: raw } }
  }
  return { path, route: null }
}

export function pathFor(screen: ScreenId, id = '', query?: Record<string, string | number | undefined>): string {
  let path = PATHS[screen].replace(':id', encodeURIComponent(id))
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const search = params.toString()
  if (search) path += '?' + search
  return path
}

/** Same path as `route` with some query parameters changed; empty values are removed. */
export function withQuery(route: Route, patch: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams(route.query)
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === '') query.delete(key)
    else query.set(key, String(value))
  })
  const search = query.toString()
  return route.key.split('?')[0] + (search ? '?' + search : '')
}

const listeners = new Set<() => void>()
let current = parseHash(window.location.hash)

function refresh() {
  const next = parseHash(window.location.hash)
  if (next.route?.key === current.route?.key && next.path === current.path) return
  current = next
  listeners.forEach((listener) => listener())
}

// Back/forward fire popstate; manual edits of the address bar fire hashchange.
window.addEventListener('popstate', refresh)
window.addEventListener('hashchange', refresh)

/**
 * Change the URL. Uses the History API so the new route is visible synchronously — code that
 * navigates and then opens a modal (Cổng khởi động → Tạo hợp đồng) sees the new page right away.
 */
export function navigate(path: string, options: { replace?: boolean } = {}): void {
  const hash = '#' + path
  if (window.location.hash === hash) return
  if (options.replace) window.history.replaceState(null, '', hash)
  else window.history.pushState(null, '', hash)
  refresh()
}

export function currentLocation(): Location {
  return current
}

export function useLocation(): Location {
  return useSyncExternalStore((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, currentLocation)
}
