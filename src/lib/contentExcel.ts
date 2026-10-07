import type { ContentItem } from '../store/types'
import { validDate } from './contentWorkflow'

export const PLAN_FIELDS = ['stt', 'mission', 'category', 'title', 'mainIdea', 'contentDirection', 'visualDirection', 'format', 'id'] as const
export const PLAN_HEADERS = ['STT', 'Nhiệm vụ', 'Thể loại', 'Chủ đề / tên bài', 'Ý tưởng chung', 'Ý tưởng triển khai nội dung', 'Ý tưởng triển khai hình ảnh', 'Định dạng', 'Mã bài']
export type PlanField = typeof PLAN_FIELDS[number]
export type Mapping = Record<PlanField, number>
export interface ImportRow { line: number; values: Partial<ContentItem>; existing?: ContentItem; error: string; duplicate: boolean }
const normalize = (text: string) => text.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ')
export const EXTRA_FIELDS = { section: 'Mục nội dung bổ sung', ignore: 'Không nhập', postDate: 'Ngày đăng dự kiến', deadlineScript: 'Hạn Content', deadlineEdit: 'Hạn dựng / thiết kế', content: 'Content phụ trách', media: 'Media phụ trách', platforms: 'Kênh xuất bản' }
export type ExtraField = keyof typeof EXTRA_FIELDS
export type ExtraMapping = Record<number, ExtraField>
const CONFIG_HEADER = 'Cấu hình mục nội dung'
export function extraColumns(headers: string[], mapping: Mapping) {
  const used = new Set([...Object.values(mapping), ...Object.values(mapHeaders(headers))])
  return headers.map((title, index) => ({ index, title: title.replace(/^Mục thêm · /i, '').trim() })).filter((entry) => entry.title && !used.has(entry.index) && entry.title !== CONFIG_HEADER)
}
export function mapExtraHeaders(headers: string[], mapping: Mapping): ExtraMapping {
  return Object.fromEntries(extraColumns(headers, mapping).map(({ title, index }) => {
    if (/^Mục thêm · /i.test(headers[index])) return [index, 'section']
    const key = normalize(title)
    const field: ExtraField = ['ngày đăng', 'ngày đăng dự kiến'].includes(key) ? 'postDate' : ['hạn script', 'hạn content'].includes(key) ? 'deadlineScript' : ['hạn dựng', 'hạn media', 'hạn dựng / thiết kế'].includes(key) ? 'deadlineEdit' : ['content', 'content phụ trách'].includes(key) ? 'content' : ['media', 'media phụ trách'].includes(key) ? 'media' : ['kênh', 'kênh xuất bản'].includes(key) ? 'platforms' : 'section'
    return [index, field]
  }))
}
function importDate(text: string) {
  const parts = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  return parts ? `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : text
}

export function mapHeaders(headers: string[]): Mapping {
  return Object.fromEntries(PLAN_FIELDS.map((key, index) => {
    const aliases = key === 'title' ? ['chủ đề', 'tiêu đề', 'chủ đề / tên bài'] : key === 'mainIdea' ? ['ý tưởng chung', 'ý tưởng / thông điệp chính'] : [PLAN_HEADERS[index]]
    return [key, headers.findIndex((header) => aliases.map(normalize).includes(normalize(header)))]
  })) as Mapping
}

export function previewPlan(rows: string[][], headerRow: number, mapping: Mapping, existing: ContentItem[], extraMapping = mapExtraHeaders(rows[headerRow - 1] ?? [], mapping)): ImportRow[] {
  const ids = new Set<string>()
  const headers = rows[headerRow - 1] ?? []
  const columns = extraColumns(headers, mapping)
  const extras = columns.filter((entry) => (extraMapping[entry.index] ?? 'section') === 'section')
  const duplicateExtras = new Set(extras.map((entry) => normalize(entry.title))).size !== extras.length
  return rows.slice(headerRow).map((row, offset): ImportRow => {
    const get = (key: PlanField) => row[mapping[key]]?.trim() ?? ''
    const title = get('title'), id = get('id'), rawFormat = normalize(get('format')), mission = normalize(get('mission'))
    const format = rawFormat === 'video' ? 'Video' : ['ảnh', 'hình ảnh', 'image'].includes(rawFormat) ? 'Ảnh' : rawFormat === 'album' ? 'Album' : undefined
    const matched = id ? existing.find((item) => item.id === id) : undefined
    const errors = [!title && 'Thiếu tên bài', !format && 'Định dạng phải là Video, Hình ảnh hoặc Album', !['bán hàng', 'thương hiệu'].includes(mission) && 'Nhiệm vụ phải là Bán hàng hoặc Thương hiệu', id && !matched && 'Mã bài không thuộc chu kỳ đã chọn', id && ids.has(id) && 'Mã bài lặp trong file'].filter(Boolean)
    if (id) ids.add(id)
    if (duplicateExtras) errors.push('Tên cột bổ sung bị trùng; đổi tên cột trước khi nhập')
    const values: Partial<ContentItem> = { title, mission: mission === 'bán hàng' ? 'Bán hàng' : 'Thương hiệu', format }
    for (const key of ['category', 'mainIdea', 'contentDirection', 'visualDirection'] as const) if (mapping[key] >= 0) values[key] = get(key)
    const metadata = columns.filter((entry) => !['ignore', 'section'].includes(extraMapping[entry.index] ?? 'section'))
    if (new Set(metadata.map((entry) => extraMapping[entry.index])).size !== metadata.length) errors.push('Một trường nghiệp vụ chỉ ghép với một cột')
    for (const entry of metadata) {
      const key = extraMapping[entry.index], value = row[entry.index]?.trim() ?? ''
      if (key === 'postDate' || key === 'deadlineScript' || key === 'deadlineEdit') {
        const date = importDate(value)
        if (date && !validDate(date)) errors.push(entry.title + ': dùng ngày dd/mm/yyyy hoặc yyyy-mm-dd')
        else values[key] = date
      } else if (key === 'content' || key === 'media') {
        values.assignees ??= structuredClone(matched?.assignees ?? { content: [], media: [] })
        values.assignees[key] = [...new Set(value.split(',').map((name) => name.trim()).filter(Boolean))]
      } else if (key === 'platforms') {
        const platforms = value.split(/[,;]/).map((name) => normalize(name)).filter(Boolean)
        if (platforms.some((name) => !['facebook', 'tiktok'].includes(name))) errors.push('Kênh chỉ nhận Facebook / TikTok, cách nhau bằng dấu phẩy')
        else values.channels = [...new Set(platforms)].map((name) => { const platform = name === 'facebook' ? 'Facebook' : 'TikTok'; return matched?.channels.find((entry) => entry.platform === platform) ?? { platform, status: 'Chưa lên lịch', time: '17:00', link: '' } })
      }
    }
    if (Object.hasOwn(values, 'postDate') && (values.channels || matched?.channels.length)) values.channels = (values.channels ?? matched!.channels).map((channel) => ({ ...channel, postDate: values.postDate }))
    if (extras.length) {
      const sections = (matched?.planSections ?? []).map((section) => ({ ...section }))
      for (const extra of extras) {
        const body = row[extra.index]?.trim() ?? ''
        const section = sections.find((section) => normalize(section.title) === normalize(extra.title))
        if (section) section.body = body
        else if (body) sections.push({ id: crypto.randomUUID(), title: extra.title, body })
      }
      values.planSections = sections
    }
    const configText = row[headers.indexOf(CONFIG_HEADER)]?.trim()
    if (configText) {
      try {
        const config = JSON.parse(configText)
        if (!config || !Array.isArray(config.hidden) || !config.hidden.every((key: unknown) => ['mainIdea', 'contentDirection', 'visualDirection'].includes(String(key))) || typeof config.labels !== 'object' || !config.labels || Object.values(config.labels).some((value) => typeof value !== 'string') || !Array.isArray(config.sections) || !config.sections.every((section: { id?: unknown; title?: unknown; body?: unknown; hidden?: unknown }) => typeof section.id === 'string' && typeof section.title === 'string' && typeof section.body === 'string' && (section.hidden === undefined || typeof section.hidden === 'boolean'))) throw new Error()
        values.planLabels = config.labels; values.planHidden = config.hidden
        const importedSections = values.planSections ?? []
        values.planSections = config.sections.map((section: NonNullable<ContentItem['planSections']>[number]) => ({ ...section, body: importedSections.find((entry) => normalize(entry.title) === normalize(section.title))?.body ?? section.body }))
        values.planSections!.push(...importedSections.filter((section) => !values.planSections!.some((entry) => normalize(entry.title) === normalize(section.title))))
      } catch { errors.push('Cấu hình mục nội dung không hợp lệ') }
    }
    return { line: headerRow + offset + 1, values, existing: matched, error: errors.join(' · '), duplicate: !id && (existing.some((item) => normalize(item.title) === normalize(title)) || rows.slice(headerRow, headerRow + offset).some((prev) => normalize(prev[mapping.title] ?? '') === normalize(title))) }
  }).filter((_, index) => rows[headerRow + index]?.some((cell) => cell.trim()))
}

export async function readWorkbook(file: File): Promise<{ name: string; rows: string[][] }[]> {
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  return workbook.worksheets.map((sheet) => {
    if (sheet.rowCount > 2000 || sheet.columnCount > 60) throw new Error('Sheet quá giới hạn 2.000 dòng / 60 cột')
    const rows: string[][] = []
    for (let n = 1; n <= Math.min(sheet.rowCount, 2000); n++) {
      const row: string[] = []
      for (let c = 1; c <= Math.min(sheet.columnCount, 60); c++) { const cell = sheet.getRow(n).getCell(c); row.push(cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text) }
      rows.push(row)
    }
    return { name: sheet.name, rows }
  })
}

export async function exportPlan(contents: ContentItem[], filename: string) {
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook(), sheet = workbook.addWorksheet('Content Plan')
  const extras = [...new Set(contents.flatMap((item) => item.planSections?.map((section) => section.title) ?? []))]
  const metadata = ['Ngày đăng dự kiến', 'Hạn Content', 'Hạn dựng / thiết kế', 'Content phụ trách', 'Media phụ trách', 'Kênh xuất bản']
  sheet.addRow([...PLAN_HEADERS, ...extras.map((title) => 'Mục thêm · ' + title), ...metadata, CONFIG_HEADER])
  contents.forEach((item) => sheet.addRow([...PLAN_FIELDS.map((field) => item[field] ?? ''), ...extras.map((title) => item.planSections?.find((section) => section.title === title)?.body ?? ''), item.postDate, item.deadlineScript, item.deadlineEdit, item.assignees?.content.join(', ') ?? '', item.assignees?.media.join(', ') ?? '', item.channels?.map((channel) => channel.platform).join(', '), JSON.stringify({ labels: item.planLabels ?? {}, hidden: item.planHidden ?? [], sections: item.planSections ?? [] })]))
  sheet.columns.forEach((column, index) => { column.width = index >= 4 && index <= 6 ? 48 : 24 })
  sheet.eachRow((row) => { row.alignment = { vertical: 'top', wrapText: true } })
  sheet.getColumn(sheet.columnCount).hidden = true
  sheet.views = [{ state: 'frozen', xSplit: 4, ySplit: 1 }]
  const bytes = await workbook.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename + '.xlsx'
  document.body.appendChild(anchor); anchor.click(); anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

/** Excel/Sheets clipboard TSV supports quoted cells containing tabs and newlines. */
export function parsePastedPlan(text: string): string[][] {
  const rows: string[][] = [], row: string[] = []
  let cell = '', quoted = false
  const finish = () => { row.push(cell); cell = '' }
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '"' && (quoted || !cell)) {
      if (quoted && text[index + 1] === '"') { cell += '"'; index++ }
      else quoted = !quoted
    } else if (!quoted && char === '\t') finish()
    else if (!quoted && (char === '\n' || char === '\r')) { if (char === '\r' && text[index + 1] === '\n') index++; finish(); rows.push(row.splice(0)) }
    else cell += char
  }
  if (quoted) throw new Error('Ô có dấu ngoặc kép chưa đóng. Sao chép lại cả vùng ô từ Excel.')
  if (cell || row.length) { finish(); rows.push(row) }
  if (rows.length > 2000 || rows.some((entry) => entry.length > 60)) throw new Error('Sheet quá giới hạn 2.000 dòng / 60 cột')
  return rows
}
