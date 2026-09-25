import { useApp } from '../../app/context'
import { field } from '../../lib/form'
import { FormActions, Modal } from '../../ui/Modal'

export function QuickTaskModal() {
  const { toast, closeModal } = useApp()
  return (
    <Modal
      title="Tạo công việc"
      backdropClassName=""
      onSubmit={(form) => {
        closeModal()
        toast(field(form, 'owner') && field(form, 'deadline')
          ? 'Đã lưu công việc ở trạng thái Đã lập kế hoạch.'
          : 'Đã lưu Nháp. Cần người phụ trách và hạn hoàn thành để bắt đầu.')
      }}
    >
      <div className="form">
        <div className="field"><label htmlFor="taskTitle">Tên công việc</label><input id="taskTitle" name="title" required autoFocus placeholder="Ví dụ: Gửi Content Plan tháng 10" /></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="taskProject">Dự án</label><select id="taskProject" name="project"><option>Cơm Tấm Tài</option><option>Vua Chả Cá</option><option>Maya Thai</option></select></div>
          <div className="field"><label htmlFor="taskOwner">Người nhận</label><select id="taskOwner" name="owner"><option value="">Chưa chọn</option><option>Thảo Hiền</option><option>Thương Mai</option><option>Minh Long Studio</option></select></div>
        </div>
        <div className="form-grid">
          <div className="field"><label htmlFor="taskDeadline">Deadline</label><input id="taskDeadline" name="deadline" type="date" /></div>
          <div className="field"><label htmlFor="taskPriority">Priority</label><select id="taskPriority" name="priority"><option>Thông thường</option><option>Gấp</option><option>Cao</option></select></div>
        </div>
        <div className="alert"><b>Điều kiện bắt đầu</b><small>Phải có người phụ trách và hạn hoàn thành.</small></div>
        <FormActions submit="Lưu task" />
      </div>
    </Modal>
  )
}
