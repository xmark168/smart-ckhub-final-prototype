import { Icon } from '../../lib/icons'
import type { Project } from '../../store/types'

export function ProjectActivityRows({ project }: { project: Project }) {
  if (!project.activities.length) return <p className="project-empty-log">Chưa có hoạt động được ghi nhận.</p>
  return (
    <>
      {project.activities.map((entry, index) => (
        <div className="project-status-row" key={index}>
          <Icon name={entry.icon || 'history'} />
          <span><b>{entry.title}</b><small>{entry.detail}</small></span>
        </div>
      ))}
    </>
  )
}
