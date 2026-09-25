import { useApp } from '../../../app/context'
import { formatDate, parseInput } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import type { KeyNote, Project } from '../../../store/types'
import { KeyNoteModal, LinksModal } from '../ContentModals'

const NOTE_TONE: Record<KeyNote['type'], string> = { 'Từ khách': 'info', 'Từ Account': 'waiting', 'Shooting recap': 'ok' }

export function DocsTab({ project }: { project: Project }) {
  const { showModal } = useApp()
  const links: Array<[string, string, string]> = [
    ['Folder dự án', 'Ảnh, video, file gốc và toàn bộ tài liệu', project.links.folder],
    ['Content Plan', 'Kế hoạch nội dung theo tháng', project.links.contentPlan],
    ['Content Post', 'Bản viết, caption và lịch đăng', project.links.contentPost],
    ['Key Notes', 'Kiến thức khách hàng, feedback, quyết định', project.links.keyNotes],
  ]
  return (
    <>
      <div className="project-doc-list">
        {links.map(([title, text, href]) =>
          href ? (
            <a key={title} href={href} target="_blank" rel="noreferrer">
              <Icon name="folder-open" />
              <span><b>{title}</b><small>{text}</small></span>
              <em>Mở Drive <Icon name="external-link" /></em>
            </a>
          ) : (
            <a key={title} href="#" onClick={(event) => { event.preventDefault(); showModal(<LinksModal project={project} />) }}>
              <Icon name="link" />
              <span><b>{title}</b><small>Chưa có liên kết</small></span>
              <em>Thêm link</em>
            </a>
          ),
        )}
      </div>
      <p className="project-tab-note"><button className="text-btn" onClick={() => showModal(<LinksModal project={project} />)}>Sửa liên kết Drive</button></p>
      <section className="panel project-notes">
        <div className="panel-head">
          <div><h2>Key notes</h2><p className="subline">Ngắn, có ngữ cảnh. Shooting recap ghi ngay sau buổi quay.</p></div>
          <button className="text-btn" onClick={() => showModal(<KeyNoteModal project={project} />)}>+ Key note</button>
        </div>
        {project.keyNotes.map((note) => (
          <div className="project-note-row" key={note.id}>
            <span className={'pill ' + NOTE_TONE[note.type]}>{note.type}</span>
            <div><b>{note.content}</b><small>{note.author} · {formatDate(parseInput(note.date))}</small></div>
          </div>
        ))}
        {!project.keyNotes.length && <p className="empty-copy">Chưa có Key note.</p>}
      </section>
    </>
  )
}
