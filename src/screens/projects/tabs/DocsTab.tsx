import { useApp } from '../../../app/context'
import { Icon } from '../../../lib/icons'
import type { Project } from '../../../store/types'
import { LinksModal } from '../ContentModals'

/** Drive links; the working documents live on Drive. */
export function DocsTab({ project }: { project: Project }) {
  const { showModal } = useApp()
  const links: Array<[string, string]> = [
    ['Folder dự án', project.links.folder],
    ['Content Plan', project.links.contentPlan],
    ['Content Post', project.links.contentPost],
    ['Key Notes', project.links.keyNotes],
  ]
  return (
    <section className="panel doc-links">
      <div className="panel-head">
        <h2>Tài liệu trên Drive</h2>
        <button className="text-btn" onClick={() => showModal(<LinksModal project={project} />)}>Sửa liên kết</button>
      </div>
      <div className="doc-link-row">
        {links.map(([title, href]) =>
          href ? (
            <a key={title} className="doc-link" href={href} target="_blank" rel="noreferrer"><Icon name="folder-open" /> {title} <Icon name="external-link" /></a>
          ) : (
            <button key={title} type="button" className="doc-link is-empty" onClick={() => showModal(<LinksModal project={project} />)}><Icon name="link" /> {title} · thêm link</button>
          ),
        )}
      </div>
    </section>
  )
}
