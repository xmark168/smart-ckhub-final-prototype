const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const Module = require('node:module')
const react = require('react')
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const original = Module._load
const item = { id: 'test-post', title: 'Bài thử', mainIdea: '', stage: 'Script', postDate: '2026-09-10', publishedAt: '2026-09-10', mediaLink: 'https://example.com/post', format: 'Video', mission: 'Bán hàng', category: 'Review', stt: 1 }
const project = { id: 'test-project', owner: 'Tester', customer: 'Fixture', state: 'active', cycles: [{ no: 1, status: 'running', contents: [item] }] }
let state = 0, message = ''
Module._load = function(request, parent, isMain) {
  if (request === 'react') return { ...react, useState: () => [['', false, ''][state++], () => {}] }
  if (request.endsWith('/app/context')) return { useApp: () => ({ role: 'account', account: 'Tester', toast: (text) => message = text }) }
  if (request.endsWith('/store/store')) return { getData: () => ({ projects: [project] }), useData: () => ({ tasks: [] }) }
  if (request.endsWith('/projects/projectLogic')) return { updateProject: (_, change) => change(project) }
  return original.call(this, request, parent, isMain)
}
const { ContentPlanWorkspace } = require('../src/screens/operations/ContentPlanWorkspace.tsx')
const row = { project, cycleNo: 1, item, timing: 'Đúng hạn' }
const render = () => { state = 0; return ContentPlanWorkspace({ rows: [row], editable: true, onOpen() {} }) }
function find(node, match) {
  if (!node || typeof node !== 'object') return undefined
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, match); if (found) return found } return undefined }
  if (match(node)) return node
  return find(node.props?.children, match)
}
const blur = (placeholder, value) => {
  const input = find(render(), (node) => node.props?.placeholder === placeholder)
  const target = { value }
  input.props.onBlur({ currentTarget: target })
  return target.value
}
assert.equal(blur('Thông điệp chính, điểm thu hút của bài…', 'Ý mới\nDòng hai'), 'Ý mới\nDòng hai')
assert.equal(item.mainIdea, 'Ý mới\nDòng hai')
assert.equal(item.publishedAt, '2026-09-10'); assert.equal(item.stage, 'Script'); assert.equal(item.mediaLink, 'https://example.com/post')
assert.equal(blur('Tên bài trong Content Plan', '  '), 'Bài thử'); assert.match(message, /không được trống/)
const staleInput = find(render(), (node) => node.props?.placeholder === 'Thông điệp chính, điểm thu hút của bài…')
project.members = []
const staleValue = { value: 'Không được lưu' }; staleInput.props.onBlur({ currentTarget: staleValue })
assert.equal(staleValue.value, 'Ý mới\nDòng hai'); assert.equal(item.mainIdea, 'Ý mới\nDòng hai')
project.members = undefined; project.cycles[0].status = 'closed'
staleValue.value = 'Không được lưu'; staleInput.props.onBlur({ currentTarget: staleValue })
assert.equal(staleValue.value, 'Ý mới\nDòng hai')
project.cycles[0].status = 'running'
assert.equal(blur('https://docs.google.com/…', 'javascript:alert(1)'), ''); assert(!item.documentLink)
assert.equal(blur('https://docs.google.com/…', 'https://example.com/doc'), 'https://example.com/doc'); assert.equal(item.documentLink, 'https://example.com/doc')
const add = find(render(), (node) => node.type === 'select' && node.props.defaultValue === '')
add.props.onChange({ target: { value: 'Thoại Talent' } })
assert.equal(item.planSections[0].title, 'Thoại Talent')
blur('Nhập thoại talent…', 'QL: Xin chào\nNV: Dạ')
assert.equal(item.planSections[0].body, 'QL: Xin chào\nNV: Dạ')
const rename = find(render(), (node) => node.props?.['aria-label'] === 'Tên mục Ý tưởng chung')
rename.props.onBlur({ currentTarget: { value: 'Hook / thông điệp' } })
assert.equal(item.planLabels.mainIdea, 'Hook / thông điệp')
const hide = find(render(), (node) => node.type === 'button' && node.props.children === 'Ẩn mục')
hide.props.onClick(); assert(item.planHidden.includes('mainIdea')); assert.equal(item.mainIdea, 'Ý mới\nDòng hai')
const restore = find(render(), (node) => node.type === 'button' && Array.isArray(node.props.children) && node.props.children[0] === 'Hiện ')
restore.props.onClick(); assert(!item.planHidden.includes('mainIdea'))
item.stage = 'Đã đăng'
const publishedText = item.mainIdea
blur('Thông điệp chính, điểm thu hút của bài…', 'Cannot edit published')
assert.equal(item.mainIdea, publishedText)
item.stage = 'Script'
item.workflow = { phase: 'content-review', revision: 1, history: [] }
blur('Thông điệp chính, điểm thu hút của bài…', 'Cannot edit submitted')
assert.equal(item.mainIdea, publishedText)
item.workflow = undefined
project.cycles[0].status = 'closed'
const count = item.planSections.length
add.props.onChange({ target: { value: 'Caption' } }); assert.equal(item.planSections.length, count)
Module._load = original
console.log('PASS: workspace autosave preserves multiline text/publication data; blank title, revoked grant, closed cycle and unsafe document URL rejected.')

const { contentAssignees } = require('../src/lib/content.ts')
const assignments = [
  { projectId: 'test-project', source: 'test-project:c1:test-post:script', assignee: ' Content A ' },
  { projectId: 'test-project', source: 'test-project:c1:test-post:edit', assignee: 'Media B, Media C' },
  { projectId: 'other', source: 'other:c1:test-post:edit', assignee: 'Other' },
]
assert.deepEqual(contentAssignees(assignments, 'test-project', 1, 'test-post'), { content: 'Content A', media: 'Media B, Media C' })
assert.deepEqual(contentAssignees(assignments, 'test-project', 2, 'test-post'), { content: 'Chưa phân công', media: 'Chưa phân công' })
assert.equal(contentAssignees(assignments.map((task) => ({ ...task, assignee: 'Updated' })), 'test-project', 1, 'test-post').content, 'Updated')
console.log('PASS: post assignees follow Script/Edit tasks, isolate project/cycle and reflect reassignment.')
