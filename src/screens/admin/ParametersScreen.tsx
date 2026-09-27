import { useApp } from '../../app/context'
import { DEFAULT_PARAMS, PARAM_META } from '../../data/params'
import { update, useData } from '../../store/store'
import type { SopParams } from '../../store/types'

/** Operating parameters from the SOP. Administrator edits; Account and BODs read. */
export function ParametersScreen() {
  const { role, toast } = useApp()
  const { params } = useData()
  const editable = role === 'admin'
  const set = (key: keyof SopParams, value: number | boolean) =>
    update((draft) => {
      ;(draft.params as unknown as Record<string, number | boolean>)[key] = value
    })
  const changed = PARAM_META.filter((meta) => params[meta.key] !== DEFAULT_PARAMS[meta.key]).length + (params.requireBriefBeforeT0 !== DEFAULT_PARAMS.requireBriefBeforeT0 ? 1 : 0)

  return (
    <section className="screen active" id="parameters">
      <div className="page-head">
        <div><h1>Tham số vận hành</h1><p>Các con số của SOP Timeline &amp; Phân công. Mốc của các chu kỳ mở từ nay tính theo những con số này.</p></div>
        {editable && (
          <div className="top-right">
            <button
              className="secondary"
              disabled={!changed}
              onClick={() => {
                update((draft) => {
                  draft.params = { ...DEFAULT_PARAMS }
                })
                toast('Đã đưa toàn bộ tham số về mặc định SOP.')
              }}
            >
              Về mặc định SOP{changed ? ' (' + changed + ')' : ''}
            </button>
          </div>
        )}
      </div>
      <section className="panel">
        <div className="param-list">
          {PARAM_META.map((meta) => {
            const value = params[meta.key] as number
            const fallback = DEFAULT_PARAMS[meta.key] as number
            return (
              <div className="param-row" key={meta.key}>
                <div>
                  <b>{meta.label}</b>
                  <small>{meta.help}</small>
                </div>
                <label className="param-input">
                  <input
                    type="number"
                    min={meta.min ?? 0}
                    value={value}
                    disabled={!editable}
                    aria-label={meta.label}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      if (Number.isFinite(next) && next >= (meta.min ?? 0)) set(meta.key, next)
                    }}
                  />
                  <span>{meta.unit}</span>
                </label>
                <span className="param-default">
                  {value !== fallback ? (
                    editable ? <button className="text-btn" onClick={() => set(meta.key, fallback)}>Về {fallback}</button> : 'SOP: ' + fallback
                  ) : 'Mặc định SOP'}
                </span>
              </div>
            )
          })}
          <div className="param-row">
            <div>
              <b>Bắt buộc brief trước T0</b>
              <small>SOP: T0 là khi khách đã cọc và cung cấp đủ brief. Tắt để brief thành việc làm sau khi khởi động.</small>
            </div>
            <label className="filter-check">
              <input type="checkbox" checked={params.requireBriefBeforeT0} disabled={!editable} onChange={(event) => set('requireBriefBeforeT0', event.target.checked)} /> Bật
            </label>
            <span className="param-default">{params.requireBriefBeforeT0 === DEFAULT_PARAMS.requireBriefBeforeT0 ? 'Mặc định SOP' : 'SOP: bật'}</span>
          </div>
        </div>
        {!editable && <p className="project-tab-note">Chỉ Administrator được sửa tham số. Account và BODs xem để hiểu cách hệ thống tính mốc.</p>}
      </section>
    </section>
  )
}
