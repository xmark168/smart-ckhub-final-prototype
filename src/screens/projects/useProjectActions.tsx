import { useApp } from '../../app/context'
import { newCycle } from '../../data/cycles'
import { TODAY } from '../../lib/format'
import { runningCycle } from '../../lib/sop'
import { useData } from '../../store/store'
import type { Project } from '../../store/types'
import { AccountSummaryModal } from '../customers/CustomerModals'
import { CloseCycleModal } from './ContentModals'
import { CancelDraftModal, EditProjectModal, OnboardingModal, PauseProjectModal, StartProjectModal, StopProjectModal } from './ProjectModals'
import { addProjectActivity, canStopProject, onboardingReady, updateProject } from './projectLogic'

/** Project actions shared by the detail header, its tabs and the list. */
export function useProjectActions(project: Project) {
  const { role, account, toast, showModal } = useApp()
  const { params } = useData()
  const canStop = canStopProject(role, account, project)
  const start = () => {
    if (!onboardingReady(project, params)) {
      toast('Hoàn tất Cổng khởi động trước khi bắt đầu triển khai.')
      showModal(<OnboardingModal project={project} />)
      return
    }
    showModal(<StartProjectModal project={project} />)
  }
  return {
    canStop,
    start,
    edit: () => showModal(<EditProjectModal project={project} />),
    onboarding: () => showModal(<OnboardingModal project={project} />),
    account: () => showModal(<AccountSummaryModal owner={project.owner} />),
    closeCycle: () => {
      if (!runningCycle(project)) return toast('Không có chu kỳ đang chạy.')
      showModal(<CloseCycleModal project={project} />)
    },
    toggleRisk: () =>
      updateProject(project.id, (item) => {
        item.risk = !item.risk
        addProjectActivity(
          item,
          'flag',
          item.risk ? 'Đã gắn cờ cần chú ý' : 'Đã gỡ cờ cần chú ý',
          item.risk ? 'Account cần kiểm soát tiến độ trong chu kỳ hiện tại.' : 'Không còn điểm rủi ro đang mở.',
        )
      }),
    pause: () => showModal(<PauseProjectModal project={project} />),
    cancelDraft: () => {
      if (!canStop) return toast('Chỉ Account phụ trách hoặc Account tạo dự án được hủy.')
      showModal(<CancelDraftModal project={project} />)
    },
    stop: () => {
      if (!canStop) return toast('Chỉ Account phụ trách hoặc Account tạo dự án được phép dừng.')
      showModal(<StopProjectModal project={project} />)
    },
    resume: () =>
      updateProject(project.id, (item) => {
        const reopened = item.state === 'stopped'
        item.state = 'active'
        item.pause = undefined
        item.stop = undefined
        if (!runningCycle(item) && item.cycles.length < item.total) item.cycles.push(newCycle(item.cycles.length + 1, TODAY, params))
        addProjectActivity(item, 'play', reopened ? 'Đã mở lại dự án' : 'Đã tiếp tục triển khai', runningCycle(item) ? 'Chu kỳ ' + runningCycle(item)!.no + ' đang chạy.' : 'Không còn chu kỳ trong hợp đồng.')
      }),
  }
}
