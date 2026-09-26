import { useApp } from '../app/context'
import { field } from '../lib/form'
import { FormActions, Modal, Req } from './Modal'

const QUICK = ['Khách phản hồi chậm', 'Khách không hài lòng nội dung', 'Rủi ro thanh toán', 'Thiếu nguồn lực Media', 'Khách có ý định dừng']

/** Asks why something is flagged "cần chú ý"; the reason is required. */
export function FlagModal({ subject, onConfirm }: { subject: string; onConfirm: (reason: string) => void }) {
  const { closeModal } = useApp()
  return (
    <Modal
      title={subject}
      onSubmit={(form) => {
        onConfirm(field(form, 'reason'))
        closeModal()
      }}
    >
      <div className="form">
        <label className="field">Lý do<Req />
          <textarea name="reason" required autoFocus placeholder="Ví dụ: khách chê tone video tuần 2, cần họp lại trước 30.09" />
        </label>
        <div className="flag-quick">
          {QUICK.map((text) => (
            <button
              key={text}
              type="button"
              onClick={(event) => {
                const area = event.currentTarget.closest('form')?.elements.namedItem('reason') as HTMLTextAreaElement | null
                if (area) area.value = area.value ? area.value + '; ' + text : text
              }}
            >
              {text}
            </button>
          ))}
        </div>
        <FormActions submit="Gắn cờ" />
      </div>
    </Modal>
  )
}
