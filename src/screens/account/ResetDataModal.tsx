import { useApp } from '../../app/context'
import { resetData } from '../../store/store'
import { Modal } from '../../ui/Modal'

export function ResetDataModal() {
  const { closeModal, toast } = useApp()
  return (
    <Modal title="Khôi phục dữ liệu mẫu" onSubmit={() => { resetData(); closeModal(); toast('Đã khôi phục dữ liệu mẫu.') }}>
      <div className="form">
        <div className="customer-data-rules"><b>Xóa thay đổi đã lưu trên trình duyệt này</b><p>Khách hàng, dự án, hợp đồng, gói dịch vụ và công việc quay về dữ liệu mẫu ban đầu. Không ảnh hưởng máy khác.</p></div>
        <div className="form-actions">
          <button className="secondary" type="button" onClick={closeModal}>Hủy</button>
          <button className="primary">Khôi phục</button>
        </div>
      </div>
    </Modal>
  )
}
