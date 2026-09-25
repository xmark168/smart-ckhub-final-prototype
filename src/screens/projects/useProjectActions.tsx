import { useApp } from '../../app/context'
import type { Project } from '../../store/types'
import { ActualEndModal, EditProjectModal, OnboardingModal, StartProjectModal, StopProjectModal } from './ProjectModals'
import { addProjectActivity, canStopProject, onboardingReady, updateProject } from './projectLogic'

/** Shared project actions so the generic and the Cơm Tấm Tài layouts behave the same. */
export function useProjectActions(project: Project) {
  const { role, toast, showModal, openCycle } = useApp()
  const start = () => {
    if (!onboardingReady(project)) {
      toast('Hoàn tất Cổng khởi động trước khi bắt đầu triển khai.')
      showModal(<OnboardingModal project={project} />)
      return
    }
    showModal(<StartProjectModal project={project} />)
  }
  return {
    edit: () => showModal(<EditProjectModal project={project} />),
    openCycle: () => (project.state === 'draft' ? start() : openCycle(project.id)),
    onboarding: () => showModal(<OnboardingModal project={project} />),
    actualEnd: () => showModal(<ActualEndModal project={project} />),
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
    toggleState: () => {
      if (project.state === 'draft') return start()
      if (project.state === 'active') {
        if (!canStopProject(role, project)) return toast('Chỉ Account phụ trách hoặc Account tạo dự án được phép dừng.')
        return showModal(<StopProjectModal project={project} />)
      }
      updateProject(project.id, (item) => {
        item.state = 'active'
        addProjectActivity(item, 'play', 'Đã tiếp tục triển khai', 'Tiến độ hợp đồng được giữ nguyên.')
      })
    },
  }
}
