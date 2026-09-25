import type { ReactNode } from 'react'
import type { Operations } from '../../store/types'

export type OperationType = keyof Operations

export interface CreateField {
  name: string
  label: string
  type: string
}

/** Everything that differs between the Nội dung, Lịch shooting and Công việc lists. */
export interface OperationConfig {
  type: OperationType
  id: 'posts' | 'shootings' | 'tasks'
  title: string
  description: string
  create: string
  noun: string
  placeholder: string
  statuses: string[]
  columns: string[]
  kpis: ReactNode
  fields: CreateField[]
  /** Status a newly created record starts in, and the explanation shown after saving. */
  created: [string, string]
  toRow: (form: HTMLFormElement, index: number) => string[]
  cells: (row: string[]) => ReactNode
  openText: (row: string[]) => string
}
