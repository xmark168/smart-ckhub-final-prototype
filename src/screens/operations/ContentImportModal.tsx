import { useState } from 'react'
import { useApp } from '../../app/context'
import { EXTRA_FIELDS, PLAN_FIELDS, PLAN_HEADERS, extraColumns, mapExtraHeaders, mapHeaders, parsePastedPlan, previewPlan, readWorkbook, type ExtraField, type ExtraMapping } from '../../lib/contentExcel'
import { canWriteBrief } from '../../lib/contentWorkflow'
import { applyContentImport, undoContentImport } from '../../lib/contentImport'
import { canEditProject } from '../../lib/scope'
import { getData, useData } from '../../store/store'
import type { ContentItem, Project } from '../../store/types'
import { Modal } from '../../ui/Modal'
import { updateProject } from '../projects/projectLogic'

export function ContentImportModal({ project, cycleNo }: { project: Project; cycleNo: number }) {
  const { closeModal, toast, role, account } = useApp()
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [headerRow, setHeaderRow] = useState(1)
  const [mapping, setMapping] = useState(mapHeaders([]))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [pasted, setPasted] = useState('')
  const [extraMapping, setExtraMapping] = useState<ExtraMapping>({})
  const liveProject = useData().projects.find((entry) => entry.id === project.id) ?? project
  const cycle = liveProject.cycles.find((entry) => entry.no === cycleNo)
  const rows = sheets[sheetIndex]?.rows ?? []
  const headers = rows[headerRow - 1] ?? []
  const preview = previewPlan(rows, headerRow, mapping, cycle?.contents ?? [], extraMapping)
  const accepted = preview.filter((entry) => !entry.error && (!skipDuplicates || !entry.duplicate))
  const selectSheet = (index: number) => {
    const data = sheets[index]?.rows ?? []
    const header = Math.max(0, data.findIndex((row) => mapHeaders(row).title >= 0 && mapHeaders(row).format >= 0))
    setSheetIndex(index); setHeaderRow(header + 1); setMapping(mapHeaders(data[header] ?? [])); setExtraMapping(mapExtraHeaders(data[header] ?? [], mapHeaders(data[header] ?? [])))
  }
  return <Modal title="Nhập Content Plan từ Excel" className="content-import-modal" projectId={project.id} onSubmit={() => {
    const live = getData().projects.find((entry) => entry.id === project.id)
    const liveCycle = live?.cycles.find((entry) => entry.no === cycleNo)
    if (!live || !canEditProject(role, account, live) || live.state !== 'active' || liveCycle?.status !== 'running') { toast('Chu kỳ đã chốt hoặc quyền sửa đã thay đổi.'); return }
    const fresh = previewPlan(rows, headerRow, mapping, liveCycle.contents, extraMapping)
    const valid = fresh.filter((entry) => !entry.error && (!skipDuplicates || !entry.duplicate))
    if (fresh.some((entry) => entry.error) || !valid.length) { toast('Sửa lỗi trong file hoặc cách ghép cột trước khi nhập.'); return }
    try { updateProject(project.id, (draft) => applyContentImport(draft, cycleNo, valid, account)) }
    catch (error) { toast(error instanceof Error ? error.message : 'Không nhập được nội dung.'); return }
    toast('Đã nhập ' + valid.length + ' bài.'); closeModal()
  }}>
    <div className="form">
      <p>{project.customer} · Chu kỳ {cycleNo}. Ghép cột nội dung, ngày và người phụ trách trước khi nhập. Không thay bản đã gửi duyệt hoặc kết quả đăng.</p>
      <label className="field">File Excel (.xlsx, tối đa 5 MB)<input type="file" accept=".xlsx" disabled={busy} onChange={async (event) => {
        const file = event.target.files?.[0]; if (!file) return
        setSheets([]); setError('')
        if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5 * 1024 * 1024) { setError('Chọn file .xlsx tối đa 5 MB.'); return }
        setBusy(true)
        try {
          const data = await readWorkbook(file)
          const index = Math.max(0, data.findIndex((sheet) => sheet.rows.some((row) => mapHeaders(row).title >= 0 && mapHeaders(row).format >= 0)))
          const header = Math.max(0, data[index]?.rows.findIndex((row) => mapHeaders(row).title >= 0 && mapHeaders(row).format >= 0) ?? 0)
          setSheets(data); setSheetIndex(index); setHeaderRow(header + 1); setMapping(mapHeaders(data[index]?.rows[header] ?? [])); setExtraMapping(mapExtraHeaders(data[index]?.rows[header] ?? [], mapHeaders(data[index]?.rows[header] ?? [])))
        } catch (failure) { setError(failure instanceof Error && failure.message.startsWith('Sheet quá giới hạn') ? failure.message : 'Không đọc được file Excel. Kiểm tra file rồi thử lại.') }
        finally { setBusy(false) }
      }} /></label>
      <details><summary>Dán vùng ô từ Excel / Google Sheets</summary><label className="field">Nội dung đã sao chép<textarea rows={5} value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder="Dán cả dòng tiêu đề và các dòng bài…" /></label><button className="secondary" type="button" disabled={!pasted?.trim()} onClick={() => {
        try {
          const rows = parsePastedPlan(pasted)
          const header = Math.max(0, rows.findIndex((row) => mapHeaders(row).title >= 0 && mapHeaders(row).format >= 0))
          setSheets([{ name: 'Vùng đã dán', rows }]); setSheetIndex(0); setHeaderRow(header + 1); setMapping(mapHeaders(rows[header] ?? [])); setExtraMapping(mapExtraHeaders(rows[header] ?? [], mapHeaders(rows[header] ?? []))); setError('')
        } catch (error) { setError(error instanceof Error ? error.message : 'Không đọc được vùng đã dán.') }
      }}>Xem trước vùng đã dán</button></details>
      {busy && <p>Đang đọc Excel…</p>}{error && <p role="alert">{error}</p>}
      {sheets.length > 0 && <>
        <div className="plan-import-controls"><label className="field">Tab<select value={sheetIndex} onChange={(event) => selectSheet(Number(event.target.value))}>{sheets.map((sheet, index) => <option key={index} value={index}>{sheet.name}</option>)}</select></label>
          <label className="field">Dòng tiêu đề<input type="number" min={1} max={rows.length} value={headerRow} onChange={(event) => { const n = Math.max(1, Number(event.target.value)); setHeaderRow(n); setMapping(mapHeaders(rows[n - 1] ?? [])); setExtraMapping(mapExtraHeaders(rows[n - 1] ?? [], mapHeaders(rows[n - 1] ?? []))) }} /></label></div>
        <details><summary>Kiểm tra / đổi cách ghép cột</summary><div className="plan-import-mapping">{PLAN_FIELDS.map((key, index) => <label className="field" key={key}>{PLAN_HEADERS[index]}<select value={mapping[key]} onChange={(event) => setMapping({ ...mapping, [key]: Number(event.target.value) })}><option value={-1}>Không nhập</option>{headers.map((header, col) => <option key={col} value={col}>{col + 1}. {header || '(trống)'}</option>)}</select></label>)}</div></details>
        <details open><summary>Cột bổ sung: nội dung hay thông tin nghiệp vụ?</summary><div className="plan-import-mapping">{extraColumns(headers, mapping).map(({ index, title }) => <label className="field" key={index}>{title}<select value={extraMapping?.[index] ?? 'section'} onChange={(event) => setExtraMapping({ ...extraMapping, [index]: event.target.value as ExtraField })}>{Object.entries(EXTRA_FIELDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>)}</div></details>
        <label><input type="checkbox" checked={skipDuplicates} onChange={(event) => setSkipDuplicates(event.target.checked)} /> Bỏ qua tên bài nghi trùng khi chưa có mã</label>
        <p>{accepted.filter((entry) => !entry.existing).length} bài mới · {accepted.filter((entry) => entry.existing).length} cập nhật · {preview.filter((entry) => entry.error).length} lỗi. File tối đa 2.000 dòng / 60 cột mỗi tab.</p>
        <div className="project-table-wrap"><table className="project-table-new"><thead><tr><th>Dòng</th><th>Tên bài</th><th>Định dạng</th><th>Kết quả</th></tr></thead><tbody>{preview.map((entry) => <tr key={entry.line}><td>{entry.line}</td><td>{entry.values.title}<details><summary>Xem nội dung</summary><div className="import-content-preview">{entry.existing && <><b>Nội dung hiện tại</b><ImportInfo values={entry.existing} /><p>{entry.existing.title}</p><p>{entry.existing.mainIdea}</p><p>{entry.existing.contentDirection}</p><p>{entry.existing.visualDirection}</p><b>Nội dung sau nhập</b></>}<ImportInfo values={entry.values} /><b>Ý tưởng chung</b><p>{entry.values.mainIdea || '—'}</p><b>Triển khai nội dung</b><p>{entry.values.contentDirection || '—'}</p><b>Triển khai hình ảnh / thoại</b><p>{entry.values.visualDirection || '—'}</p>{entry.values.planSections?.map((section) => <div key={section.id}><b>{section.title}</b><p>{section.body || '—'}</p></div>)}</div></details></td><td>{entry.values.format}</td><td>{entry.error || (entry.duplicate ? skipDuplicates ? 'Bỏ qua · nghi trùng' : 'Thêm mới · nghi trùng' : entry.existing ? !canWriteBrief(role, account, liveProject, cycleNo, entry.existing) ? 'Chỉ xem · cần tạo bản sửa' : 'Cập nhật nội dung' : 'Thêm mới')}</td></tr>)}</tbody></table></div>
      </>}
      {Boolean(cycle?.contentImports?.length) && <details><summary>Lịch sử nhập · hoàn tác</summary><p className="cd-note">Hoàn tác toàn đợt khi các bài chưa sửa hoặc bàn giao tiếp. Giữ lịch sử đợt nhập.</p>{cycle?.contentImports?.map((batch) => <section className="content-import-batch" key={batch.id}><span>{batch.by} · {new Date(batch.at).toLocaleString('vi-VN')} · {batch.changes.length} bài</span><button type="button" className="secondary" disabled={Boolean(batch.undoneAt)} onClick={() => {
        try { updateProject(project.id, (draft) => undoContentImport(draft, cycleNo, batch.id, account)); toast('Đã hoàn tác đợt nhập.') } catch (error) { toast(error instanceof Error ? error.message : 'Không hoàn tác được.') }
      }}>{batch.undoneAt ? 'Đã hoàn tác' : 'Hoàn tác đợt này'}</button></section>)}</details>}
      <div className="form-actions"><button type="button" className="secondary" onClick={closeModal}>Đóng</button><button className="primary" disabled={busy || !accepted.length || preview.some((entry) => entry.error) || accepted.some((entry) => entry.existing && !canWriteBrief(role, account, liveProject, cycleNo, entry.existing))}>Nhập {accepted.length} bài</button></div>
    </div>
  </Modal>
}

function ImportInfo({ values }: { values: Partial<ContentItem> }) {
  return <div>{(['postDate', 'deadlineScript', 'deadlineEdit'] as const).map((key, index) => Object.hasOwn(values, key) && <p key={key}>{['Ngày đăng dự kiến', 'Hạn Content', 'Hạn dựng / thiết kế'][index]}: {values[key] || 'Chưa chọn'}</p>)}{values.assignees && <><p>Content: {values.assignees.content.join(', ') || 'Chưa phân công'}</p><p>Media: {values.assignees.media.join(', ') || 'Chưa phân công'}</p></>}{values.channels && <p>Kênh: {values.channels.map((entry) => entry.platform).join(', ') || 'Chưa chọn'}</p>}</div>
}
