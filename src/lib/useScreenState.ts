import { useState, type Dispatch, type SetStateAction } from 'react'

const memory = new Map<string, unknown>()

/**
 * useState that survives unmounting for the rest of the session, so list filters and paging
 * are still there when the user comes back from a detail screen.
 */
export function useScreenState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => (memory.has(key) ? (memory.get(key) as T) : initial))
  const set: Dispatch<SetStateAction<T>> = (next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? (next as (previous: T) => T)(current) : next
      memory.set(key, resolved)
      return resolved
    })
  }
  return [value, set]
}
