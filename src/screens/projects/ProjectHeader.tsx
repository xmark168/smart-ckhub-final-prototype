import { useState } from 'react'
import { useApp, type ProjectTab } from '../../app/context'
import { paymentMetrics, primaryContract, projectOverdue } from '../../data/contracts'
import { diffDays, shortDate, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { currentCycle, expectedPublished, nextActions, projectHealth, runningCycle } from '../../lib/sop'
import { useOutsideClose } from '../../lib/useOutsideClose'
import { useData } from '../../store/store'
import type { Project } from '../../store/types'
import { shortMoney } from '../customers/customerLogic'
import { postProgress, projectLabel } from './projectLogic'
import { useProjectActions } from './useProjectActions'

/** Milestone key → the tab where it is worked on. */
const MILESTONE_TAB: Record<string, ProjectTab> = { cadence: 'noi-dung' }
const tabOf = (key: string): ProjectTab => MILESTONE_TAB[key] ?? (key.startsWith('script') ? 'noi-dung' : 'chu-ky')

const HEALTH_CLASS: Record<string, string> = { late: 'late', watch: 'watch', ok: 'ok' }

/** Days until the running cycle must be closed (negative = overdue), or null. */
function closeIn(project: Project): number | null {
  const cycle = runningCycle(project)
  return cycle ? diffDays(TODAY, cycle.plannedEnd) : null
}

export function ProjectHeader({ project, readOnly, onTab }: { project: Project; readOnly: boolean; onTab: (tab: ProjectTab) => void }) {
  const { go, openCustomer, role, account } = useApp()
  // Account shown only when it is not the signed-in Account's own project.
  const showOwner = role !== 'account' || project.owner !== account
  const { params, contracts } = useData()
  const actions = useProjectActions(project)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useOutsideClose<HTMLDivElement>(menuOpen, () => setMenuOpen(false))
  const health = projectHealth(project, params, TODAY, projectOverdue(contracts, project.id))
  const active = project.state === 'active'
  const days = closeIn(project)
  // Closing is the primary action only when the cycle is near or past its end.
  const closeIsPrimary = active && days !== null && days <= params.cycleEndWarningDays
  const badge = active ? { cls: 'health-' + (HEALTH_CLASS[health.level] ?? 'ok'), label: health.label } : { cls: 'state-' + project.state, label: projectLabel(project) }

  const menu: Array<[string, string, () => void]> = []
  if (active && runningCycle(project) && !closeIsPrimary) menu.push(['calendar-check-2', 'Chốt chu kỳ', actions.closeCycle])
  if (project.state !== 'stopped' && project.state !== 'draft') menu.push(['flag', project.risk ? 'Gỡ cờ cần chú ý' : 'Gắn cờ cần chú ý', actions.toggleRisk])
  if (active) menu.push(['circle-pause', 'Tạm dừng', actions.pause])
  if (project.state === 'draft') menu.push(['circle-x', 'Hủy nháp', actions.cancelDraft])
  if (project.state !== 'stopped' && project.state !== 'draft') menu.push(['circle-stop', 'Dừng dự án', actions.stop])
  const run = (action: () => void) => { setMenuOpen(false); action() }

  return (
    <div className="project-detail-head">
      <button className="project-detail-back" onClick={() => go('projects')}><Icon name="arrow-left" /> Dự án</button>
      <div className="project-head-grid">
        <div className="project-head-text">
          <div className="project-title-line">
            <h1>
              <button type="button" className="title-link" onClick={() => openCustomer(project.customerId)} title="Mở hồ sơ khách hàng">
                {project.customer} <Icon name="chevron-right" />
              </button>
            </h1>
            <span className={'state-badge ' + badge.cls}>{badge.label}</span>
          </div>
          <p className="project-subtitle">{project.service}</p>
          {showOwner && <p className="project-meta-line"><span>Account {project.owner}</span></p>}
        </div>
        <div className="project-head-actions" hidden={readOnly}>
          <button className="secondary" onClick={actions.edit}><Icon name="pencil" /> Sửa</button>
          {project.state === 'draft' && <button className="primary" onClick={actions.start}><Icon name="play" /> Bắt đầu triển khai</button>}
          {closeIsPrimary && <button className="primary" onClick={actions.closeCycle}><Icon name="calendar-check-2" /> Chốt chu kỳ</button>}
          {(project.state === 'pending' || project.state === 'stopped') && <button className="primary" onClick={actions.resume}><Icon name="play" /> {project.state === 'pending' ? 'Tiếp tục' : 'Mở lại'}</button>}
          {menu.length > 0 && (
            <div className="head-menu" ref={menuRef}>
              <button type="button" className="secondary head-menu-trigger" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Thao tác khác" onClick={() => setMenuOpen(!menuOpen)}>⋯</button>
              {menuOpen && (
                <div className="head-menu-list" role="menu">
                  {menu.map(([icon, label, action]) => (
                    <button key={label} type="button" role="menuitem" className={icon === 'circle-stop' || icon === 'circle-x' ? 'danger' : ''} onClick={() => run(action)}>
                      <Icon name={icon} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <HealthBand project={project} onTab={onTab} />
    </div>
  )
}

function dayText(days: number): string {
  return days < 0 ? 'quá ' + -days + ' ngày' : days === 0 ? 'hôm nay' : 'còn ' + days + ' ngày'
}

/**
 * Project dashboard: what needs action, is output keeping pace with time, and where the
 * contract/money stands. Three blocks, each answering one question.
 */
function HealthBand({ project, onTab }: { project: Project; onTab: (tab: ProjectTab) => void }) {
  const { params, contracts } = useData()
  const overdue = projectOverdue(contracts, project.id)
  const health = projectHealth(project, params, TODAY, overdue)
  const cycle = currentCycle(project)
  const running = runningCycle(project)
  const posts = postProgress(project)
  const contract = primaryContract(contracts, project.id)
  const metrics = contract ? paymentMetrics(contract) : null
  const open = nextActions(project, params)
  const urgent = open.filter((item) => item.state === 'late' || item.state === 'due').slice(0, 3)
  const upcoming = open.find((item) => item.state === 'upcoming')
  const tone = project.state === 'active' ? HEALTH_CLASS[health.level] ?? 'ok' : 'muted'

  // Pace: share of the cycle elapsed vs share of posts published (and where the cadence says we should be).
  const length = running ? diffDays(running.start, running.plannedEnd) + 1 : 0
  const elapsed = running ? Math.max(0, diffDays(running.start, TODAY) + 1) : 0
  const timePct = length ? Math.min(100, Math.round((elapsed / length) * 100)) : 0
  const cadenceStart = running ? running.demo.approvedAt || (project.quota.shoots === 0 ? running.plan.approvedAt : '') : ''
  const expected = running && project.quota.posts ? expectedPublished(cadenceStart, project.quota, params, TODAY) : 0
  const postPct = posts ? Math.min(100, Math.round((posts.published / Math.max(1, posts.planned)) * 100)) : 0
  const expectedPct = posts ? Math.min(100, Math.round((expected / Math.max(1, posts.planned)) * 100)) : 0
  const behind = posts ? Math.max(0, expected - posts.published) : 0
  const cyclesLeft = project.total ? Math.max(0, project.total - project.cycles.length) : 0
  const cadence = params.postsPerWeekMin + '–' + params.postsPerWeekMax + ' bài/tuần'

  const lateCount = urgent.filter((item) => item.state === 'late').length

  return (
    <section className={'health-band v4 tone-' + tone} aria-label="Tình trạng dự án">
      <div className="hb-main">
        <div className="hb-head">
          <span className="hb-label">{urgent.length ? 'Cần xử lý ngay' : project.state === 'active' ? 'Việc tiếp theo' : 'Trạng thái'}</span>
          {urgent.length > 0 && <span className="hb-count">{lateCount ? lateCount + ' quá hạn' : urgent.length + ' đến hạn'}</span>}
        </div>
        {urgent.length ? (
          <ul className="hb-todo">
            {urgent.map((item) => (
              <li key={item.key}>
                <button type="button" className={'is-' + item.state} onClick={() => onTab(tabOf(item.key))}>
                  <i aria-hidden="true" />
                  <span className="t">{item.label}</span>
                  <span className="d">{item.due ? dayText(diffDays(TODAY, item.due)) : ''}</span>
                  <Icon name="chevron-right" />
                </button>
              </li>
            ))}
          </ul>
        ) : project.state === 'active' && upcoming ? (
          <ul className="hb-todo">
            <li>
              <button type="button" className="is-upcoming" onClick={() => onTab(tabOf(upcoming.key))}>
                <i aria-hidden="true" />
                <span className="t">{upcoming.label}</span>
                <span className="d">{upcoming.due ? dayText(diffDays(TODAY, upcoming.due)) : ''}</span>
                <Icon name="chevron-right" />
              </button>
            </li>
          </ul>
        ) : <p className="hb-note">{health.reason}</p>}
      </div>

      <div className="hb-pace">
        <div className="hb-head"><span className="hb-label">Tiến độ chu kỳ {cycle ? cycle.no : ''}</span></div>
        {running ? (
          <>
            <div className="pace-item">
              <div className="pace-top"><span>Thời gian</span><b className={elapsed > length ? 'is-late' : ''}>{elapsed > length ? 'quá ' + (elapsed - length) + ' ngày' : 'ngày ' + elapsed + ' / ' + length}</b></div>
              <span className="pace-bar" aria-hidden="true"><i className={elapsed > length ? 'over' : ''} style={{ width: timePct + '%' }} /></span>
            </div>
            {posts && (
              <div className="pace-item">
                <div className="pace-top"><span>Bài đăng</span><b className={behind ? 'is-due' : ''}>{posts.published} / {posts.planned}{posts.bonus ? ' (+' + posts.bonus + ' tặng)' : ''}</b></div>
                <span className="pace-bar" aria-hidden="true">
                  <i className={behind ? 'behind' : 'ahead'} style={{ width: postPct + '%' }} />
                  {expected > 0 && <b className="pace-mark" style={{ left: expectedPct + '%' }} />}
                </span>
              </div>
            )}
            <small className={behind ? 'pace-note is-late' : 'pace-note'}>
              {!posts
                ? 'Gói không có bài đăng.'
                : !cadenceStart
                  ? 'Nhịp đăng bắt đầu sau khi khách duyệt Post Demo.'
                  : behind
                    ? 'Chậm ' + behind + ' bài · theo nhịp ' + cadence + ' nên đạt ' + expected + ' (vạch trắng)'
                    : 'Đúng nhịp ' + cadence}
            </small>
          </>
        ) : <p className="hb-note">{cycle ? 'Chu kỳ ' + cycle.no + ' đã chốt.' : 'Chưa bắt đầu triển khai.'}</p>}
      </div>

      <button type="button" className="hb-contract hb-link" onClick={() => onTab('hop-dong')} disabled={!contract}>
        <div className="hb-head"><span className="hb-label">Hợp đồng</span>{contract && <Icon name="chevron-right" />}</div>
        {contract && metrics ? (
          <>
            <strong className={overdue ? 'is-late' : ''}>{overdue ? shortMoney(overdue) : metrics.remaining ? shortMoney(metrics.remaining) : 'Đã thu đủ'}</strong>
            <small className="hb-money-note">{overdue ? 'quá hạn · đợt ' + (metrics.next?.installment ?? '') + ' · ' + shortDate(metrics.next?.due ?? '') : metrics.remaining ? 'còn thu' + (metrics.next ? ' · đợt tới ' + shortDate(metrics.next.due) : '') : 'không còn đợt thanh toán'}</small>
            <span className="hb-cycles">Chu kỳ {cycle ? cycle.no : 0}/{project.total || '–'}{cyclesLeft ? ' · còn ' + cyclesLeft : ' · cuối, cần tái ký'}</span>
          </>
        ) : <p className="hb-note">Chưa có hợp đồng chính.</p>}
      </button>
    </section>
  )
}
