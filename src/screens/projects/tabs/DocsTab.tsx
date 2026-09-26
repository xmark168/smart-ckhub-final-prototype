import { useApp } from '../../../app/context'
import { Icon } from '../../../lib/icons'
import type { Project } from '../../../store/types'
import { LinksModal } from '../ContentModals'

/** The project's Drive folder; working documents live there. */
export function DocsTab({ project }: { project: Project }) {
  const { showModal } = useApp()
  const folder = project.links.folder
  return (
    <section className="panel doc-links">
      <div className="panel-head">
        <h2>Folder dự án</h2>
        <button className="text-btn" onClick={() => showModal(<LinksModal project={project} />)}>{folder ? 'Sửa link' : '+ Thêm link'}</button>
      </div>
      {folder
        ? <a className="doc-link" href={folder} target="_blank" rel="noreferrer"><Icon name="folder-open" /> Mở folder trên Drive <Icon name="external-link" /></a>
        : <p className="empty-copy">Chưa có link folder.</p>}
    </section>
  )
}
