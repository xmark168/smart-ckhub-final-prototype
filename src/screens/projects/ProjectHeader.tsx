import { useState } from 'react'
import { useApp, type ProjectTab } from '../../app/context'
import { paymentMetrics, primaryContract, projectOverdue } from '../../data/contracts'
import { diffDays, shortDate, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { currentCycle, nextActions, projectHealth, runningCycle } from '../../lib/sop'
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

function HealthBand({ project, onTab }: { project: Project; onTab: (tab: ProjectTab) => void }) {
  const { params, contracts } = useData()
  const overdue = projectOverdue(contracts, project.id)
  const health = projectHealth(project, params, TODAY, overdue)
  const cycle = currentCycle(project)
  const posts = postProgress(project)
  const contract = primaryContract(contracts, project.id)
  const metrics = contract ? paymentMetrics(contract) : null
  const urgent = nextActions(project, params).filter((item) => item.state === 'late' || item.state === 'due').slice(0, 3)
  const days = closeIn(project)
  const tone = project.state === 'active' ? HEALTH_CLASS[health.level] ?? 'ok' : 'muted'

  return (
    <section className={'health-band tone-' + tone} aria-label="Tình trạng dự án">
      <div className="hb-main">
        <span className="hb-label">{urgent.length ? 'Cần xử lý ngay' : project.state === 'active' ? 'Tình hình' : 'Trạng thái'}</span>
        {urgent.length || (overdue > 0 && project.state === 'active') ? (
          <ul className="hb-chips">
            {urgent.map((item) => (
              <li key={item.key}>
                <button type="button" className={'hb-chip is-' + item.state} onClick={() => onTab(tabOf(item.key))}>
                  {item.label}{item.due ? ' · ' + (diffDays(TODAY, item.due) < 0 ? 'quá ' + -diffDays(TODAY, item.due) + ' ngày' : diffDays(TODAY, item.due) === 0 ? 'hôm nay' : 'còn ' + diffDays(TODAY, item.due) + ' ngày') : ''} ›
                </button>
              </li>
            ))}
            {overdue > 0 && !urgent.length && (
              <li><button type="button" className="hb-chip is-late" onClick={() => onTab('hop-dong')}>Công nợ quá hạn {shortMoney(overdue)} ›</button></li>
            )}
          </ul>
        ) : <p className="hb-note">{health.reason}</p>}
      </div>
      <div className="hb-stat">
        <span className="hb-label">Chu kỳ</span>
        <strong>{cycle ? cycle.no + '/' + (project.total || '–') : '—'}</strong>
        <small>
          {cycle ? shortDate(cycle.start) + ' – ' + shortDate(cycle.plannedEnd) : 'Chưa bắt đầu'}
          {days !== null && <em className={days < 0 ? 'is-late' : days <= params.cycleEndWarningDays ? 'is-due' : ''}>{days < 0 ? 'quá hạn chốt ' + -days + ' ngày' : 'chốt sau ' + days + ' ngày'}</em>}
        </small>
      </div>
      <div className="hb-stat">
        <span className="hb-label">Bài đăng</span>
        <strong>{posts ? posts.published + '/' + posts.planned : '—'}</strong>
        <small>{posts ? (posts.bonus ? '+' + posts.bonus + ' bài tặng' : 'trong chu kỳ') : 'Gói không có bài đăng'}</small>
      </div>
      <button type="button" className="hb-stat hb-link" onClick={() => onTab('hop-dong')} disabled={!contract}>
        <span className="hb-label">Công nợ</span>
        <strong className={overdue ? 'is-late' : ''}>{metrics ? (overdue ? shortMoney(overdue) : metrics.remaining ? shortMoney(metrics.remaining) : 'Đã thu đủ') : '—'}</strong>
        <small>{!metrics ? 'Chưa có hợp đồng' : overdue ? 'quá hạn' + (metrics.next ? ' · đợt ' + metrics.next.installment + ' · ' + shortDate(metrics.next.due) : '') : metrics.next ? 'đợt tới ' + shortDate(metrics.next.due) : 'không còn đợt'}</small>
      </button>
    </section>
  )
}
