import type { ReactNode } from 'react'
import { useApp } from '../../app/context'
import { paymentMetrics, primaryContract, projectOverdue } from '../../data/contracts'
import { allShootings } from '../../data/shootings'
import { addDaysIso, diffDays, shortDate, TODAY } from '../../lib/format'
import { Icon } from '../../lib/icons'
import { inScope } from '../../lib/scope'
import { projectHealth } from '../../lib/sop'
import { useData } from '../../store/store'
import type { Project, WorkTask } from '../../store/types'
import { renewalDue, shortMoney } from '../customers/customerLogic'

function dueText(due: string): string {
  const days = diffDays(TODAY, due)
  return days < 0 ? 'quá ' + -days + ' ngày' : days === 0 ? 'hôm nay' : days === 1 ? 'mai' : shortDate(due)
}

/** Health of every project in scope, most urgent first. */
function useHealth(projects: Project[]) {
  const { params, contracts } = useData()
  return projects
    .filter((project) => project.state === 'active' || project.state === 'pending')
    .map((project) => ({ project, health: projectHealth(project, params, TODAY, projectOverdue(contracts, project.id)) }))
    .sort((a, b) => ['late', 'watch', 'paused', 'finished', 'ok'].indexOf(a.health.level) - ['late', 'watch', 'paused', 'finished', 'ok'].indexOf(b.health.level))
}

function Kpi({ label, value, note, tone = '', onClick }: { label: string; value: string | number; note: string; tone?: string; onClick: () => void }) {
  return <button type="button" className={('home-kpi ' + tone).trim()} onClick={onClick}><span>{label}</span><b>{value}</b><small>{note}</small></button>
}

function TaskLine({ task, project, showWho }: { task: WorkTask; project: Project; showWho?: boolean }) {
  const { openProject } = useApp()
  return (
    <button type="button" className={'home-line' + (task.due < TODAY ? ' is-late' : '')} onClick={() => openProject(project.id, task.tab)}>
      <span><b>{task.title}</b><small>{project.customer}{showWho ? ' · ' + (task.assignee || 'chưa giao') : ''}</small></span>
      <em>{dueText(task.due)}</em>
    </button>
  )
}

function Panel({ title, action, onAction, children, empty }: { title: string; action?: string; onAction?: () => void; children: ReactNode[]; empty: string }) {
  return (
    <section className="panel home-panel">
      <div className="panel-head"><h2>{title}</h2>{action && <button type="button" className="text-btn" onClick={onAction}>{action} ›</button>}</div>
      {children.length ? <div className="home-lines">{children}</div> : <p className="empty-copy">{empty}</p>}
    </section>
  )
}

/** Account: my work today, who is late on my projects, projects needing attention, shoots this week. */
function AccountHome() {
  const { account, role, go, openProject } = useApp()
  const { projects, tasks, contracts } = useData()
  const mine = projects.filter((project) => project.state !== 'stopped' && inScope(role, account, project))
  const byId = new Map(mine.map((project) => [project.id, project]))
  const open = tasks.filter((task) => task.status === 'open' && byId.has(task.projectId)).sort((a, b) => a.due.localeCompare(b.due))
  const myNow = open.filter((task) => task.assignee === account && task.due <= addDaysIso(TODAY, 2))
  const othersLate = open.filter((task) => task.assignee !== account && task.due < TODAY)
  const attention = useHealth(mine).filter((item) => item.health.level === 'late' || item.health.level === 'watch')
  const overdue = contracts.filter((row) => byId.has(row.projectId) && row.status === 'Hiệu lực').reduce((sum, row) => sum + paymentMetrics(row).overdue, 0)
  const week = allShootings(mine).filter((row) => row.shooting.date >= TODAY && row.shooting.date <= addDaysIso(TODAY, 7) && row.shooting.status !== 'Đã hoàn thành').sort((a, b) => a.shooting.date.localeCompare(b.shooting.date))
  const myLate = myNow.filter((task) => task.due < TODAY).length

  return (
    <>
      <section className="home-kpis">
        <Kpi label="Việc của tôi" value={myNow.length} note={myLate ? myLate + ' quá hạn · còn lại đến hạn 2 ngày tới' : 'Đến hạn trong 2 ngày tới'} tone={myLate ? 'attention' : ''} onClick={() => go('tasks')} />
        <Kpi label="Người khác đang trễ" value={othersLate.length} note="Content, Media, Kế toán trên dự án của tôi" tone={othersLate.length ? 'watch' : ''} onClick={() => go('tasks')} />
        <Kpi label="Dự án cần chú ý" value={attention.length} note={attention.filter((item) => item.health.level === 'late').length + ' chậm tiến độ'} onClick={() => go('projects')} />
        <Kpi label="Công nợ quá hạn" value={shortMoney(overdue) || '0'} note="Hợp đồng dự án của tôi" tone={overdue ? 'watch' : ''} onClick={() => go('contracts')} />
      </section>
      <div className="home-grid">
        <Panel title="Việc của tôi" action="Tất cả việc" onAction={() => go('tasks')} empty="Không có việc đến hạn.">
          {myNow.slice(0, 8).map((task) => <TaskLine key={task.id} task={task} project={byId.get(task.projectId)!} />)}
        </Panel>
        <Panel title="Dự án cần chú ý" action="Dự án" onAction={() => go('projects')} empty="Mọi dự án đúng tiến độ.">
          {attention.slice(0, 6).map(({ project, health }) => (
            <button type="button" key={project.id} className={'home-line' + (health.level === 'late' ? ' is-late' : '')} onClick={() => openProject(project.id)}>
              <span><b>{project.customer} <i className="home-pkg">{project.service.split(' · ')[0]}</i></b><small>{health.reason}</small></span>
              <em className={'pill ' + health.tone}>{health.label}</em>
            </button>
          ))}
        </Panel>
        <Panel title="Người khác đang trễ" action="Việc cần làm" onAction={() => go('tasks')} empty="Không ai trễ việc trên dự án của bạn.">
          {othersLate.slice(0, 6).map((task) => <TaskLine key={task.id} task={task} project={byId.get(task.projectId)!} showWho />)}
        </Panel>
        <Panel title="Lịch shoot 7 ngày tới" action="Lịch shooting" onAction={() => go('shootings')} empty="Không có buổi shoot trong tuần.">
          {week.slice(0, 6).map((row) => (
            <button type="button" key={row.shooting.id} className="home-line" onClick={() => openProject(row.project.id, 'quay-chup')}>
              <span><b>{row.project.customer} · buổi {row.no}</b><small>{[row.shooting.time, row.shooting.location, row.shooting.media.join(', ')].filter(Boolean).join(' · ')}</small></span>
              <em>{dueText(row.shooting.date)}</em>
            </button>
          ))}
        </Panel>
      </div>
    </>
  )
}

/** BODs: the whole company at a glance, then per Account. */
function BodsHome() {
  const { go, openProject } = useApp()
  const { projects, tasks, contracts } = useData()
  const health = useHealth(projects)
  const running = projects.filter((project) => project.state === 'active')
  const late = health.filter((item) => item.health.level === 'late')
  const openLate = tasks.filter((task) => task.status === 'open' && task.due < TODAY)
  const active = contracts.filter((row) => row.status === 'Hiệu lực')
  const overdue = active.reduce((sum, row) => sum + paymentMetrics(row).overdue, 0)
  const renew = running.filter((project) => {
    const contract = primaryContract(contracts, project.id)
    return contract && renewalDue(project, contract)
  })
  const owners = [...new Set(running.map((project) => project.owner))].sort()
  const rows = owners.map((owner) => {
    const own = health.filter((item) => item.project.owner === owner)
    const ids = new Set(own.map((item) => item.project.id))
    return {
      owner,
      running: own.filter((item) => item.project.state === 'active').length,
      late: own.filter((item) => item.health.level === 'late').length,
      watch: own.filter((item) => item.health.level === 'watch').length,
      tasks: openLate.filter((task) => ids.has(task.projectId)).length,
      debt: active.filter((row) => ids.has(row.projectId)).reduce((sum, row) => sum + paymentMetrics(row).overdue, 0),
    }
  }).sort((a, b) => b.late - a.late || b.tasks - a.tasks)

  return (
    <>
      <section className="home-kpis">
        <Kpi label="Đang triển khai" value={running.length} note={late.length + ' chậm tiến độ'} tone={late.length ? 'attention' : ''} onClick={() => go('projects')} />
        <Kpi label="Việc quá hạn" value={openLate.length} note="Toàn công ty, mọi người làm" tone={openLate.length ? 'watch' : ''} onClick={() => go('tasks')} />
        <Kpi label="Công nợ quá hạn" value={shortMoney(overdue) || '0'} note={active.filter((row) => paymentMetrics(row).overdue).length + ' hợp đồng'} tone={overdue ? 'watch' : ''} onClick={() => go('contracts')} />
        <Kpi label="Cần tái ký" value={renew.length} note="Chu kỳ cuối hoặc HĐ hết trong 30 ngày" onClick={() => go('projects')} />
      </section>
      <div className="home-grid">
        <section className="panel home-panel home-wide">
          <div className="panel-head"><h2>Theo Account</h2></div>
          <table className="home-table">
            <thead><tr><th>Account</th><th>Đang chạy</th><th>Chậm</th><th>Cần theo dõi</th><th>Việc quá hạn</th><th>Công nợ quá hạn</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.owner}>
                  <td><b>{row.owner}</b></td><td>{row.running}</td>
                  <td className={row.late ? 'is-late' : ''}>{row.late}</td><td>{row.watch}</td>
                  <td className={row.tasks ? 'is-late' : ''}>{row.tasks}</td><td>{row.debt ? shortMoney(row.debt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <Panel title="Dự án chậm tiến độ" action="Dự án" onAction={() => go('projects')} empty="Không có dự án chậm.">
          {late.slice(0, 8).map(({ project, health: item }) => (
            <button type="button" key={project.id} className="home-line is-late" onClick={() => openProject(project.id)}>
              <span><b>{project.customer}</b><small>{project.owner} · {item.reason}</small></span>
              <Icon name="chevron-right" />
            </button>
          ))}
        </Panel>
        <Panel title="Sắp hết hợp đồng" action="Hợp đồng" onAction={() => go('contracts')} empty="Không có hợp đồng sắp hết.">
          {renew.slice(0, 8).map((project) => {
            const contract = primaryContract(contracts, project.id)!
            return (
              <button type="button" key={project.id} className="home-line" onClick={() => openProject(project.id, 'hop-dong')}>
                <span><b>{project.customer}</b><small>{project.owner} · {contract.code} · hết {contract.end}</small></span>
                <Icon name="chevron-right" />
              </button>
            )
          })}
        </Panel>
      </div>
    </>
  )
}

export function OverviewScreen() {
  const { role, account } = useApp()
  const bods = role !== 'account'
  return (
    <section className="screen active" id="overview">
      <div className="page-head home-head">
        <div><h1>{bods ? 'Tổng quan công ty' : 'Chào ' + account}</h1><p>{bods ? 'Tiến độ, việc trễ và tiền theo từng Account.' : 'Hôm nay ' + shortDate(TODAY) + ' · việc của bạn và các dự án bạn phụ trách.'}</p></div>
      </div>
      {bods ? <BodsHome /> : <AccountHome />}
    </section>
  )
}
