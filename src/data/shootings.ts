import type { Project, Shooting } from '../store/types'

/** One shoot with the project and cycle it belongs to. Shoots live in the cycles; this is the shared view. */
export interface ShootRow {
  project: Project
  cycleNo: number
  running: boolean
  /** 1-based order within the cycle (by date, unscheduled last). */
  no: number
  shooting: Shooting
}

export function sortShoots(list: Shooting[]): Shooting[] {
  return [...list].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
}

export function allShootings(projects: Project[]): ShootRow[] {
  return projects.flatMap((project) =>
    project.cycles.flatMap((cycle) =>
      sortShoots(cycle.shootings).map((shooting, index) => ({ project, cycleNo: cycle.no, running: cycle.status === 'running', no: index + 1, shooting })),
    ),
  )
}

/** Media already booked on another shoot the same day. */
export function mediaClashes(rows: ShootRow[], date: string, media: string[], exceptId: string): Array<{ name: string; row: ShootRow }> {
  if (!date || !media.length) return []
  return rows
    .filter((row) => row.shooting.id !== exceptId && row.shooting.date === date)
    .flatMap((row) => row.shooting.media.filter((name) => media.includes(name)).map((name) => ({ name, row })))
}
