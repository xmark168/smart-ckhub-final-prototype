import { useApp } from '../../../app/context'
import { contractTone, coversProject, paymentMetrics, paymentState, paymentTone } from '../../../data/contracts'
import { formatDate, money, parseInput } from '../../../lib/format'
import { Icon } from '../../../lib/icons'
import { useData } from '../../../store/store'
import type { Project } from '../../../store/types'
import { ContractDetailModal, ContractFormModal } from '../../contracts/ContractModals'

export function ContractTab({ project }: { project: Project }) {
  const { showModal } = useApp()
  const { contracts: all, projects } = useData()
  const contracts = all.filter((row) => coversProject(row, project.id) && row.status !== 'Đã hủy')
  const primary = contracts.find((row) => row.isPrimary)

  if (!primary) {
    return (
      <section className="panel">
        <p className="empty-copy">Dự án chưa có hợp đồng chính. Hợp đồng chính là điều kiện của Cổng khởi động và quyết định số chu kỳ.</p>
        <button className="primary" onClick={() => showModal(<ContractFormModal preferredProjectId={project.id} />)}><Icon name="file-plus-2" /> Tạo hợp đồng</button>
      </section>
    )
  }

  const metrics = paymentMetrics(primary)
  const sharedWith = projects.filter((item) => item.id !== project.id && coversProject(primary, item.id))
  return (
    <>
      <div className="project-contract-summary">
        <section>
          <span>Hợp đồng chính</span>
          <b>{primary.code} <span className={'pill ' + contractTone(primary.status)}>{primary.status}</span></b>
          <small>{formatDate(parseInput(primary.start))} – {primary.end} · {primary.cycles} chu kỳ · đã chạy {project.cycles.length}</small>
          {sharedWith.length > 0 && <small>Cùng hợp đồng: {sharedWith.map((item) => item.code + ' · ' + item.service).join('; ')}</small>}
        </section>
        <section>
          <span>Giá trị / đã thu</span>
          <b>{money(primary.value)}</b>
          <small>Đã thu {money(primary.paid)} · còn {money(metrics.remaining)}{metrics.overdue ? ' · quá hạn ' + money(metrics.overdue) : ''}</small>
        </section>
        <button className="project-drive-link" onClick={() => showModal(<ContractDetailModal contractId={primary.id} />)}><Icon name="file-search" /> Mở hợp đồng</button>
      </div>
      <div className="project-payment-list">
        {primary.payments.map((payment) => {
          const state = paymentState(payment)
          return (
            <article key={payment.installment}>
              <div>
                <span>Đợt {payment.installment} / {primary.payments.length}</span>
                <b>{payment.percent}% · {money(payment.amount)}</b>
                <small>Hạn {formatDate(parseInput(payment.due))}{payment.paidAt ? ' · thu ' + formatDate(parseInput(payment.paidAt)) : ''}{payment.evidence ? ' · ' + payment.evidence : ''}</small>
              </div>
              <span className={'pill ' + paymentTone(state)}>{state}</span>
            </article>
          )
        })}
      </div>
      {contracts.length > 1 && (
        <div className="project-payment-list">
          {contracts.filter((row) => !row.isPrimary).map((row) => (
            <article key={row.id}>
              <div><span>{row.type}</span><b>{row.code} · {money(row.value)}</b><small>{row.scope}</small></div>
              <button className="text-btn" onClick={() => showModal(<ContractDetailModal contractId={row.id} />)}>Mở</button>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
