const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Excel = require('exceljs')
const Module = require('node:module')
const root = path.resolve(__dirname, '..')
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, filename)

async function main() {
  const { PLAN_HEADERS, mapHeaders, previewPlan, readWorkbook, exportPlan } = require('../src/lib/contentExcel.ts')
  const workbook = new Excel.Workbook(), sheet = workbook.addWorksheet('Content plan')
  sheet.addRow(['KẾ HOẠCH THÁNG 10'])
  sheet.addRow(['Chuẩn bị chung'])
  sheet.addRow(['STT', 'Nhiệm vụ', 'Thể loại', 'Chủ đề', 'Ý tưởng chung', 'Ý tưởng triển khai nội dung', 'Ý tưởng triển khai hình ảnh', 'Định dạng'])
  for (let n = 1; n <= 6; n++) sheet.addRow([n, 'BÁN HÀNG', 'Review (Báo giá sốc)', 'Bài ' + n, 'Ý tưởng\nDòng 2', 'Nội dung\nƯu đãi 29K', '[Thoại Talent]\n🎂\n[Cảnh quay]', n <= 4 ? 'VIDEO' : 'HÌNH ẢNH'])
  const bytes = await workbook.xlsx.writeBuffer()
  const sheets = await readWorkbook(new File([bytes], 'plan.xlsx'))
  const mapping = mapHeaders(sheets[0].rows[2])
  const preview = previewPlan(sheets[0].rows, 3, mapping, [])
  assert.equal(preview.length, 6)
  assert(preview.every((row) => !row.error))
  assert.equal(preview.filter((row) => row.values.format === 'Video').length, 4)
  assert.equal(preview[0].values.visualDirection, '[Thoại Talent]\n🎂\n[Cảnh quay]')
  const old = { id: 'stable-id', stt: 1, title: 'Bài cũ', stage: 'Đã đăng', publishedAt: '2026-09-10', postDate: '2026-09-09', channels: [{ platform: 'Facebook', status: 'Đã đăng', link: 'https://example.com/post' }], mediaLink: 'https://example.com/media', documentLink: 'https://example.com/doc', cancellation: { reason: 'Lịch sử' }, mainIdea: 'Giữ ý tưởng khi không ghép cột' }
  const updateRows = [PLAN_HEADERS, ['1', 'Bán hàng', 'Review', 'Bài sửa', 'Ý mới', 'Nội dung mới', 'Thoại mới', 'Video', old.id]]
  const mapped = mapHeaders(PLAN_HEADERS)
  const update = previewPlan(updateRows, 1, mapped, [old])[0]
  assert.equal(update.existing.id, old.id)
  const missingOptional = previewPlan(updateRows, 1, { ...mapped, mainIdea: -1 }, [old])[0]
  assert(!Object.hasOwn(missingOptional.values, 'mainIdea'))
  const wrong = structuredClone(updateRows); wrong[1][8] = 'other-cycle-id'
  assert.match(previewPlan(wrong, 1, mapped, [old])[0].error, /Mã bài/)
  assert.match(previewPlan([...updateRows, updateRows[1]], 1, mapped, [old])[1].error, /lặp/)
  const noId = structuredClone(updateRows); noId[1][8] = ''; noId[1][3] = old.title
  assert(previewPlan(noId, 1, mapped, [old])[0].duplicate)
  const invalid = structuredClone(updateRows); invalid[1][7] = 'Unknown'
  assert.match(previewPlan(invalid, 1, mapped, [old])[0].error, /Định dạng/)
  const flexible = [[...PLAN_HEADERS, 'Thoại Talent'], [...updateRows[1], 'QL: Xin chào\nNV: Dạ']]
  assert.equal(previewPlan(flexible, 1, mapped, [old])[0].values.planSections[0].body, 'QL: Xin chào\nNV: Dạ')

  // Exercise the actual import submission against isolated data, including permission revocation.
  const project = { id: 'fixture-project', owner: 'Tester', state: 'active', customer: 'Fixture', quota: { posts: 6 }, cycles: [{ no: 1, status: 'running', contents: [structuredClone(old)], activity: [] }] }
  let state = [], stateIndex = 0, message = '', closed = false
  const react = require('react')
  const originalLoad = Module._load
  Module._load = function (request, parent, isMain) {
    if (request === 'react') return { ...react, useState: () => [state[stateIndex++], () => {}] }
    if (request.endsWith('/app/context')) return { useApp: () => ({ role: 'account', account: 'Tester', toast: (text) => message = text, closeModal: () => closed = true }) }
    if (request.endsWith('/store/store')) return { getData: () => ({ projects: [project] }), useData: () => ({ projects: [project] }) }
    if (request.endsWith('/projects/projectLogic')) return { updateProject: (_, mutate) => mutate(project) }
    return originalLoad.call(this, request, parent, isMain)
  }
  const { ContentImportModal } = require(path.join(root, 'src/screens/operations/ContentImportModal.tsx'))
  const submit = (data, header, map) => {
    stateIndex = 0; closed = false
    state = [[{ name: 'Content plan', rows: data }], 0, header, map, false, '', true]
    ContentImportModal({ project, cycleNo: 1 }).props.onSubmit()
  }
  submit(updateRows, 1, mapped)
  assert(!closed); assert.match(message, /đã đăng|đã gửi duyệt/)
  old.stage = 'Script'; old.channels = []
  project.cycles[0].contents[0] = structuredClone(old)
  submit(updateRows, 1, mapped)
  assert(closed)
  const updated = project.cycles[0].contents[0]
  assert.equal(updated.title, 'Bài sửa')
  for (const key of ['id', 'stage', 'publishedAt', 'postDate', 'channels', 'mediaLink', 'documentLink', 'cancellation']) assert.deepEqual(updated[key], old[key], key + ' preserved')
  submit(sheets[0].rows, 3, mapping)
  assert.equal(project.cycles[0].contents.length, 7)
  assert(project.cycles[0].contents.slice(1).every((row) => !row.postDate && row.stage === 'Ý tưởng'))
  project.state = 'stopped'; submit(updateRows, 1, mapped); assert(!closed); assert.match(message, /quyền|chốt/)
  project.state = 'active'; project.members = []; submit(updateRows, 1, mapped); assert(!closed)
  project.members = undefined; project.cycles[0].status = 'closed'; submit(updateRows, 1, mapped); assert(!closed)
  Module._load = originalLoad

  // Run actual download serialization and read it back; no browser or user storage touched.
  let downloaded
  updated.planSections = [{ id: 'extra-1', title: 'Thoại Talent', body: 'QL: Xin chào\nNV: Dạ', hidden: true }]
  updated.planLabels = { mainIdea: 'Hook' }; updated.planHidden = ['visualDirection']
  const originalURL = URL.createObjectURL
  URL.createObjectURL = (blob) => { downloaded = blob; return 'blob:fixture' }
  global.document = { body: { appendChild() {} }, createElement: () => ({ click() {}, remove() {} }) }
  await exportPlan([updated], 'fixture')
  const roundtrip = await readWorkbook(new File([downloaded], 'fixture.xlsx'))
  assert.equal(roundtrip[0].rows[1][8], old.id)
  assert.equal(roundtrip[0].rows[1][6], 'Thoại mới')
  const extraRoundtrip = previewPlan(roundtrip[0].rows, 1, mapHeaders(roundtrip[0].rows[0]), [updated])[0]
  assert.equal(extraRoundtrip.values.planSections[0].id, 'extra-1')
  assert.equal(extraRoundtrip.values.planSections[0].body, 'QL: Xin chào\nNV: Dạ')
  assert.equal(extraRoundtrip.values.planSections[0].hidden, true)
  assert.deepEqual(extraRoundtrip.values.planLabels, { mainIdea: 'Hook' })
  assert.deepEqual(extraRoundtrip.values.planHidden, ['visualDirection'])
  URL.createObjectURL = originalURL
  console.log('PASS: Excel 6-row multiline import, ID updates, duplicate/error preview, permission and closed-cycle guards, publication history preserved, export/reimport.')
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
