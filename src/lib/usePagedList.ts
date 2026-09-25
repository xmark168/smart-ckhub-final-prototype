import { useEffect } from 'react'
import { navigate, useLocation, type Route } from '../app/router'
import { pageSlice } from './format'

/** Same URL with `?page=` set to `page` (page 1 drops the parameter). */
function withPage(route: Route, page: number): string {
  const query = new URLSearchParams(route.query)
  if (page > 1) query.set('page', String(page))
  else query.delete('page')
  const search = query.toString()
  return route.key.split('?')[0] + (search ? '?' + search : '')
}

/**
 * Paginates `list` using the `?page=` query of the current URL, so a page of a list can be
 * linked to and the browser Back button walks through pages. Out-of-range or malformed values
 * are corrected in place (replace, not a new history entry).
 */
export function usePagedList<T>(list: T[], size: number) {
  const { route } = useLocation()
  const raw = route?.query.get('page') ?? null
  const requested = raw && /^\d+$/.test(raw) ? Number(raw) : 1
  const slice = pageSlice(list, requested, size)
  const expected = slice.page > 1 ? String(slice.page) : null
  const corrected = route && raw !== expected ? withPage(route, slice.page) : null

  useEffect(() => {
    if (corrected) navigate(corrected, { replace: true })
  }, [corrected])

  return {
    ...slice,
    /** Go to another page (adds a history entry). */
    goTo: (page: number) => route && navigate(withPage(route, page)),
    /** Back to page 1 after filters change, without a history entry. */
    resetPage: () => route && navigate(withPage(route, 1), { replace: true }),
  }
}
