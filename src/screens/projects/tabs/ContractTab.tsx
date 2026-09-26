import { useApp } from '../../../app/context'
import { contractTone, coversProject, paymentMetrics, paymentState } from '../../../data/contracts'
import { diffDays, shortDate, TODAY } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { currentCycle } from '../../../lib/sop'
import { useData } from '../../../store/store'
import type { Payment, Project } from '../../../store/types'
import { ContractDetailModal, ContractFormModal } from '../../contracts/ContractModals'
import { shortMoney } from '../../customers/customerLogic'
import { addProjectActivity, updateProject } from '../projectLogic'

/** One line per installment: paid / due / overdue (with days), and a reminder for the overdue one. */
function PaymentRow({ project, payment, count }: { project: Project; payment: Payment; count: number }) {
  const { toast } = useApp()
  const state = paymentState(payment)
  const paid = payment.paid >= payment.amount
  const late = !paid && payment.due < TODAY
  const remind = () => {
    updateProject(project.id, (item) => addProjectActivity(item, 'bell', 'Đã nhắc khách thu đợt ' + payment.installment, shortMoney(payment.amount - payment.paid) + ' · hạn ' + shortDate(payment.due)))
    toast('Đã ghi nhận nhắc thu đợt ' + payment.installment + ' vào nhật ký.')
  }
  return (
    <li className={'pay-row' + (paid ? ' is-paid' : late ? ' is-late' : '')}>
      <i aria-hidden="true">{paid ? <Icon name="check" /> : late ? '!' : ''}</i>
      <b>Đợt {payment.installment}/{count} · {payment.percent}% · {shortMoney(payment.amount)}</b>
      <span className="pay-when">
        {paid && payment.paidAt ? 'thu ' + shortDate(payment.paidAt) : 'hạn ' + shortDate(payment.due) + (late ? ' · quá ' + diffDays(payment.due, TODAY) + ' ngày' : '')}
        {!paid && payment.paid > 0 && ' · đã thu ' + shortMoney(payment.paid)}
      </span>
      {late ? <button type="button" className="text-btn" onClick={remind}>Nhắc khách</button> : <span className="sr-only">{state}</span>}
    </li>
  )
}

export function ContractTab({ project }: { project: Project }) {
  const { showModal } = useApp()
  const { contracts: all, projects } = useData()
  const contracts = all.filter((row) => coversProject(row, project.id) && row.status !== 'Đã hủy')
  const primary = contracts.find((row) => row.isPrimary)

  if (!primary) {
    return (
      <section className="panel">
        <p className="empty-copy">Dự án chưa có hợp đồng chính.</p>
        <button className="primary" onClick={() => showModal(<ContractFormModal preferredProjectId={project.id} />)}><Icon name="file-plus-2" /> Tạo hợp đồng</button>
      </section>
    )
  }

  const metrics = paymentMetrics(primary)
  const paidPct = primary.value ? Math.min(100, Math.round((primary.paid / primary.value) * 100)) : 0
  const sharedWith = projects.filter((item) => item.id !== project.id && coversProject(primary, item.id))
  const others = contracts.filter((row) => !row.isPrimary)
  const cycle = currentCycle(project)

  return (
    <section className="panel contract-card">
      <div className="contract-card-head">
        <b>{primary.code}</b>
        <span className={'pill ' + contractTone(primary.status)}>{primary.status}</span>
        <button className="text-btn" onClick={() => showModal(<ContractDetailModal contractId={primary.id} />)}>Mở hợp đồng ›</button>
      </div>
      <p className="contract-card-meta">
        {shortDate(primary.start)} – {primary.end} · Chu kỳ {cycle ? cycle.no : 0} / {primary.cycles}
        {sharedWith.length > 0 && <> · cùng hợp đồng với {sharedWith.map((item) => item.service).join(', ')}</>}
      </p>
      <div className="contract-money">
        <span className="pace-bar" aria-hidden="true"><i className={metrics.overdue ? 'behind' : 'ahead'} style={{ width: paidPct + '%' }} /></span>
        <small>Đã thu <b>{shortMoney(primary.paid)}</b> / {shortMoney(primary.value)}{metrics.overdue ? <> · <b className="is-late">quá hạn {shortMoney(metrics.overdue)}</b></> : ''}</small>
      </div>
      <ol className="pay-list">
        {primary.payments.map((payment) => <PaymentRow key={payment.installment} project={project} payment={payment} count={primary.payments.length} />)}
      </ol>
      {others.length > 0 && (
        <div className="contract-others">
          {others.map((row) => (
            <button key={row.id} type="button" className="contract-other" onClick={() => showModal(<ContractDetailModal contractId={row.id} />)}>
              <span>{row.type} · <b>{row.code}</b></span><small>{shortMoney(row.value)}</small><Icon name="chevron-right" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
