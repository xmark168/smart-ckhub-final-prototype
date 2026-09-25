import { useId } from 'react'
import type { Project } from '../../store/types'

/**
 * Service line under a customer name: the main project's package, then "+N" for the others.
 * The full list shows on hover and on keyboard focus (not hover-only).
 */
export function ServicesLine({ projects }: { projects: Project[] }) {
  const id = useId()
  if (!projects.length) return <span className="customer-meta">Hồ sơ mới, chưa lập dự án</span>
  const main = projects.find((item) => item.state === 'active') ?? projects[0]
  const others = projects.filter((item) => item !== main)
  return (
    <span className="customer-meta services-line">
      <span className="services-main">{main.service}</span>
      {others.length > 0 && (
        <span className="services-more">
          <button type="button" aria-describedby={id} aria-label={'Xem thêm ' + others.length + ' gói'} onClick={(event) => event.stopPropagation()}>
            +{others.length}
          </button>
          <span role="tooltip" id={id} className="services-tip">
            {projects.map((item) => (
              <span key={item.id}><b>{item.code}</b> {item.service}</span>
            ))}
          </span>
        </span>
      )}
    </span>
  )
}
