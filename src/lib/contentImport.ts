import type { ContentItem, Project } from '../store/types'
import type { ImportRow } from './contentExcel'
import { assignmentOptions, canWriteBrief, logContent } from './contentWorkflow'
import { canEditProject } from './scope'

export function applyContentImport(project: Project, cycleNo: number, rows: ImportRow[], account: string) {
  const cycle = project.cycles.find((entry) => entry.no === cycleNo)
  if (!cycle || !canEditProject('account', account, project) || project.state !== 'active' || cycle.status !== 'running') throw new Error('Chu kỳ đã chốt hoặc quyền sửa đã thay đổi.')
  // Validate the whole batch before touching a post.
  for (const row of rows) {
    const current = row.existing ? cycle.contents.find((entry) => entry.id === row.existing!.id) : undefined
    if (row.error || row.existing && !current) throw new Error('Dữ liệu nhập đã thay đổi. Kiểm tra lại bản xem trước.')
    if (current && !canWriteBrief('account', account, project, cycleNo, current)) throw new Error('Có bài đã gửi duyệt, đã đăng hoặc đã hủy. Tạo bản sửa trước khi nhập thay đổi.')
    const old = [...(current?.assignees?.content ?? []), ...(current?.assignees?.media ?? [])]
    if (Object.values(row.values.assignees ?? {}).flat().some((name) => !assignmentOptions(project).includes(name) && !old.includes(name))) throw new Error('Nhân sự trong Excel chưa có quyền dự án. Cấp quyền hoặc bỏ ghép cột phân công.')
  }
  const changes: NonNullable<typeof cycle.contentImports>[number]['changes'] = []
  let stt = cycle.contents.reduce((max, item) => Math.max(max, item.stt), 0)
  for (const row of rows) {
    const current = row.existing ? cycle.contents.find((entry) => entry.id === row.existing!.id)! : undefined
    const before = current ? structuredClone(current) : undefined
    const item: ContentItem = current ?? { id: 'content-' + crypto.randomUUID(), stt: ++stt, bonus: cycle.contents.filter((item) => !item.bonus && item.stage !== 'Đã hủy').length >= project.quota.posts, topic: '', title: '', mission: 'Thương hiệu', category: '', format: 'Video', stage: 'Ý tưởng', postDate: '', deadlineScript: '', deadlineEdit: '', mediaLink: '', channels: [], assignees: { content: [], media: [] }, workflow: { revision: 1, phase: 'draft', history: [] } }
    if (current && Object.hasOwn(row.values, 'postDate') && row.values.postDate !== current.postDate) logContent(item, account, 'Điều chỉnh lịch từ Excel', 'Ngày cũ: ' + (current.postDate || 'Chưa chọn'))
    Object.assign(item, row.values)
    item.channels.forEach((channel) => { channel.postDate ??= item.postDate })
    logContent(item, account, current ? 'Cập nhật nội dung từ Excel' : 'Tạo bài từ Excel')
    if (!current) cycle.contents.push(item)
    changes.push({ id: item.id, before, after: structuredClone(item) })
  }
  cycle.contentImports ??= []
  cycle.contentImports.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), by: account, changes })
  cycle.activity.unshift({ title: 'Nhập Content Plan từ Excel', detail: rows.length + ' bài · chu kỳ ' + cycleNo, time: 'Vừa xong' })
}

export function undoContentImport(project: Project, cycleNo: number, importId: string, account: string) {
  const cycle = project.cycles.find((entry) => entry.no === cycleNo)
  const batch = cycle?.contentImports?.find((entry) => entry.id === importId)
  if (!cycle || !batch || batch.undoneAt || !canEditProject('account', account, project) || project.state !== 'active' || cycle.status !== 'running') throw new Error('Đợt nhập đã hoàn tác hoặc chu kỳ không còn sửa được.')
  for (const change of batch.changes) {
    const current = cycle.contents.find((entry) => entry.id === change.id)
    if (!current || !canWriteBrief('account', account, project, cycleNo, current) || JSON.stringify(current) !== JSON.stringify(change.after)) throw new Error('Có bài đã sửa hoặc bàn giao sau đợt nhập. Không thể hoàn tác đè lên thay đổi mới.')
  }
  cycle.contents = cycle.contents.flatMap((item) => {
    const change = batch.changes.find((entry) => entry.id === item.id)
    return change ? change.before ? [structuredClone(change.before)] : [] : [item]
  })
  batch.undoneAt = new Date().toISOString()
  cycle.activity.unshift({ title: 'Hoàn tác nhập Excel', detail: account + ' · ' + batch.changes.length + ' bài · chu kỳ ' + cycleNo, time: 'Vừa xong' })
}
