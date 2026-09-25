import { currentCycle } from '../../lib/sop'
import type { Project } from '../../store/types'

/** Compact project cell: main project's cycle as "4/6" with a mini bar, other projects as "+N". */
export function ProjectCell({ projects }: { projects: Project[] }) {
  if (!projects.length) return <span className="project-cell-empty">—</span>
  const main = projects.find((item) => item.state === 'active') ?? projects[0]
  const cycle = currentCycle(main)
  const more = projects.length - 1
  const title = projects.map((item) => item.code + ' · ' + item.service + ' · ' + (currentCycle(item) ? 'chu kỳ ' + currentCycle(item)!.no + '/' + (item.total || '–') : 'chưa bắt đầu')).join('\n')
  return (
    <span className="project-cell" title={title}>
      {cycle && main.total ? (
        <>
          <b>{cycle.no}/{main.total}</b>
          <i className="project-cell-bar"><em style={{ width: Math.min(100, (cycle.no / main.total) * 100) + '%' }} /></i>
        </>
      ) : (
        <b className="project-cell-draft">Chưa bắt đầu</b>
      )}
      {more > 0 && <small className="project-cell-more">+{more}</small>}
    </span>
  )
}
