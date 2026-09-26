import { useSyncExternalStore } from 'react'
import { seedCategories, seedPackages } from '../data/catalog'
import { seedContracts } from '../data/contracts'
import { seedCustomers } from '../data/customers'
import { seedOperations } from '../data/operations'
import { DEFAULT_PARAMS } from '../data/params'
import { seedProjects } from '../data/projects'
import type { AppData } from './types'

const DATA_KEY = 'smart-ckhub-data'
/** Bump when the seed or AppData shape changes so stale browser data is discarded. */
const DATA_VERSION = 15

export function createSeed(): AppData {
  const packages = structuredClone(seedPackages)
  const projects = seedProjects(packages)
  const contracts = seedContracts(projects)
  return {
    version: DATA_VERSION,
    customers: seedCustomers(),
    projects,
    contracts,
    categories: structuredClone(seedCategories),
    packages,
    operations: seedOperations(),
    profile: { name: 'Tài khoản mô phỏng', email: 'account@smartckhub.local', phone: '' },
    period: { mode: 'month', month: '09', year: '2026' },
    params: { ...DEFAULT_PARAMS },
  }
}

function load(): AppData {
  try {
    const saved = JSON.parse(localStorage.getItem(DATA_KEY) || 'null') as AppData | null
    if (saved && saved.version === DATA_VERSION) return saved
  } catch {
    // Storage blocked or corrupted: fall back to seed data.
  }
  return createSeed()
}

let data: AppData = load()
const listeners = new Set<() => void>()

function commit(next: AppData) {
  data = next
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
  } catch {
    // Prototype still works in memory when storage is unavailable.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getData(): AppData {
  return data
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData)
}

/** Apply a mutation to a copy of the data, then persist and notify subscribers. */
export function update(recipe: (draft: AppData) => void): void {
  const draft = structuredClone(data)
  recipe(draft)
  commit(draft)
}

export function resetData(): void {
  commit(createSeed())
}
