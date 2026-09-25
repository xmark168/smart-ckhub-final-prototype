import { useApp } from '../../app/context'
import { update } from '../../store/store'
import { FormActions, Modal } from '../../ui/Modal'
import type { OperationConfig } from './types'

export function CreateOperationModal({ config }: { config: OperationConfig }) {
  const { closeModal, toast } = useApp()
  return (
    <Modal
      title={'Tạo ' + config.noun}
      backdropClassName=""
      onSubmit={(form) => {
        const [status, effect] = config.created
        update((draft) => {
          const list = draft.operations[config.type] as string[][]
          list.unshift([...config.toRow(form, list.length + 1), status])
        })
        closeModal()
        toast('Đã tạo ' + config.noun + '. ' + effect)
      }}
    >
      <div className="form">
        <p className="subline">Nhập đủ field bắt buộc để tạo record.</p>
        <div className="form-grid">
          {config.fields.map((item, index) => (
            <div className="field" key={item.name}>
              <label>{item.label} *</label>
              <input type={item.type} name={item.name} required autoFocus={index === 0} />
            </div>
          ))}
        </div>
        <div className="alert"><b>Lưu ý</b><small>Các trường có dấu * là bắt buộc.</small></div>
        <FormActions submit="Lưu thay đổi" />
      </div>
    </Modal>
  )
}
