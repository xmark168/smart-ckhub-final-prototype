import { useApp } from '../../../app/context'
import { shortDate } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { runningCycle } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { KeyNote, Project } from '../../../store/types'
import { KeyNoteModal } from '../ContentModals'
import { onboardingItems, type OnboardingItem } from '../projectLogic'
import { useProjectActions } from '../useProjectActions'
import { CycleHistory, CycleSteps } from './CycleSections'

function OnboardingRow({ entry }: { entry: OnboardingItem }) {
  return (
    <div className={'onboarding-row' + (entry.ready ? ' complete' : '') + (entry.required ? '' : ' optional')}>
      <Icon name={entry.icon} />
      <span><b>{entry.title}{!entry.required && <> <small>làm sau</small></>}</b><small>{entry.detail}</small></span>
      <Icon name={entry.ready ? 'check' : 'clock-3'} />
    </div>
  )
}

function OnboardingPanel({ project }: { project: Project }) {
  const { params } = useData()
  const actions = useProjectActions(project)
  const items = onboardingItems(project, params)
  const required = items.filter((entry) => entry.required)
  const optional = items.filter((entry) => !entry.required)
  const completed = required.filter((entry) => entry.ready).length
  const ready = completed === required.length
  return (
    <section className="panel onboarding-panel">
      <div className="panel-head">
        <div><h2>Cổng khởi động</h2><p className="subline">SOP: T0 là khi khách đã cọc{params.requireBriefBeforeT0 ? ' và đủ brief' : ''}.</p></div>
        <span className={'onboarding-count' + (ready ? ' ready' : '')}>{completed} / {required.length}</span>
      </div>
      <div className="onboarding-list">{required.map((entry) => <OnboardingRow key={entry.key} entry={entry} />)}</div>
      {optional.length > 0 && (
        <details className="onboarding-later">
          <summary>{optional.filter((entry) => !entry.ready).length} việc có thể bổ sung sau</summary>
          <div>{optional.map((entry) => <OnboardingRow key={entry.key} entry={entry} />)}</div>
        </details>
      )}
      <div className="onboarding-actions">
        <small>{ready ? 'Đủ điều kiện. Account có thể bắt đầu triển khai.' : 'Còn ' + (required.length - completed) + ' điều kiện cần xử lý.'}</small>
        <button className="secondary" onClick={actions.cancelDraft} disabled={!actions.canStop} title={actions.canStop ? 'Khách không chốt' : 'Chỉ Account phụ trách hoặc Account tạo dự án'}><Icon name="circle-x" /> Hủy nháp</button>
        <button className="secondary" onClick={actions.onboarding}><Icon name="list-checks" /> Cập nhật</button>
      </div>
    </section>
  )
}

export function OverviewTab({ project }: { project: Project }) {
  const cycle = runningCycle(project)
  return (
    <div className="project-detail-grid is-single">
      <main>
        {project.state === 'draft' && <OnboardingPanel project={project} />}
        {cycle && project.state !== 'stopped' && <CycleSteps project={project} cycle={cycle} />}
        <NotesPanel project={project} />
        <CycleHistory project={project} />
      </main>
    </div>
  )
}

const NOTE_TONE: Record<KeyNote['type'], string> = { 'Từ khách': 'info', 'Từ Account': 'waiting', 'Shooting recap': 'ok' }

/** The one place for notes: the pinned operating note, then Key notes (newest first). */
function NotesPanel({ project }: { project: Project }) {
  const { showModal } = useApp()
  const actions = useProjectActions(project)
  return (
    <section className="panel project-notes">
      <div className="panel-head">
        <h2>Ghi chú</h2>
        <span className="notes-actions">
          <button className="text-btn" onClick={actions.notes}>{project.notes ? 'Sửa lưu ý' : '+ Lưu ý'}</button>
          <button className="text-btn" onClick={() => showModal(<KeyNoteModal project={project} />)}>+ Key note</button>
        </span>
      </div>
      {project.notes && <p className="project-note-text pinned">{project.notes}</p>}
      {project.keyNotes.map((note) => (
        <div className="project-note-row" key={note.id}>
          <span className={'pill ' + NOTE_TONE[note.type]}>{note.type}</span>
          <div><b>{note.content}</b><small>{note.author} · {shortDate(note.date)}</small></div>
        </div>
      ))}
      {!project.notes && !project.keyNotes.length && <p className="empty-copy">Chưa có ghi chú.</p>}
    </section>
  )
}
