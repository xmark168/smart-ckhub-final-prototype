// Isolated fixtures: no user browser storage or publication records touched.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const { contentPackages, editBriefCell, duplicateContent } = require('../src/lib/contentPackages.ts')
const { TODAY } = require('../src/lib/format.ts')
const post = { id: 'post', stt: 1, title: 'Chủ đề', mainIdea: 'Ý tưởng\nThoại', stage: 'Script', mission: 'Thương hiệu', format: 'Video', category: 'Review', topic: '', bonus: false, postDate: '2026-09-24', deadlineScript: TODAY, deadlineEdit: TODAY, mediaLink: '', channels: [{ platform: 'Facebook', status: 'Chưa lên lịch', postDate: '2026-09-24', time: '', link: '' }], assignees: { content: ['Content nội bộ'], media: ['Hải'] }, workflow: { phase: 'draft', revision: 1, history: [] }, planSections: [{ id: 'section', title: 'Thoại', body: 'Dòng 1\nDòng 2' }], planHidden: ['visualDirection'], planLabels: { mainIdea: 'Ý tưởng riêng' } }
const project = { id: 'fixture', code: 'fixture', customer: 'Fixture', owner: 'Tester', state: 'active', members: [{ name: 'Tester', role: 'account', access: 'edit' }, { name: 'Content nội bộ', role: 'partner', access: 'edit' }, { name: 'Hải', role: 'partner', access: 'edit' }], quota: { posts: 13 }, cycles: [{ no: 1, start: '2026-08-01', status: 'closed', result: { planned: 12, published: 11, note: 'Lịch sử' }, contents: [], activity: [] }, { no: 2, start: '2026-09-01', status: 'running', contents: [post, { ...structuredClone(post), id: 'gift', stt: 2, bonus: true, stage: 'Đã đăng' }, { ...structuredClone(post), id: 'cancelled', stt: 3, stage: 'Đã hủy', cancellation: { reason: 'Khách hủy' } }, { ...structuredClone(post), id: 'review', stt: 4, assignees: { content: [], media: [] }, workflow: { phase: 'content-review', revision: 1, history: [] } }], activity: [] }] }
let packages = contentPackages([project], 'account', 'Tester')
assert.equal(packages.length, 2); assert.equal(packages[0].cycle.no, 2)
assert.equal(packages[0].core, 2); assert.equal(packages[0].bonus, 1); assert.equal(packages[0].cancelled, 1)
assert.equal(packages[0].missing, 11); assert.equal(packages[0].published, 0); assert.equal(packages[0].review, 1); assert.equal(packages[0].late, 2)
assert(packages[1].summaryOnly); assert.equal(packages[1].planned, 12); assert.equal(packages[1].published, 11)
assert.equal(contentPackages([project], 'account', 'Uninvited').length, 0)
assert.equal(contentPackages([project], 'partner', 'Như').length, 0)
const assigned = contentPackages([project], 'partner', 'Content nội bộ')
assert.equal(assigned.length, 1); assert.equal(assigned[0].items.length, 3); assert.equal(assigned[0].review, 0); assert.equal(assigned[0].missing, 0)
const before = structuredClone(post)
editBriefCell(project, 2, post.id, 'mainIdea', 'Ý mới\nThoại mới', 'partner', 'Content nội bộ')
assert.equal(post.mainIdea, 'Ý mới\nThoại mới')
for (const key of ['postDate', 'publishedAt', 'stage', 'channels', 'assignees', 'workflow']) assert.deepEqual(post[key], before[key])
assert.throws(() => editBriefCell(project, 2, post.id, 'title', ' ', 'account', 'Tester'), /không được trống/)
assert.throws(() => editBriefCell(project, 2, 'review', 'title', 'Bypass review', 'account', 'Tester'), /gửi duyệt/)
assert.throws(() => editBriefCell(project, 2, post.id, 'format', 'Unknown', 'account', 'Tester'), /Định dạng/)
assert.throws(() => editBriefCell(project, 2, post.id, 'title', 'Wrong team', 'partner', 'Hải'), /quyền/)
project.members[1].access = 'view'
assert.throws(() => editBriefCell(project, 2, post.id, 'title', 'Revoked', 'partner', 'Content nội bộ'), /quyền/)
project.members[1].access = 'edit'
const source = project.cycles[1].contents[1]; source.mediaLink = 'https://example.com/render'; source.sourceLink = 'https://example.com/source'; source.publishedAt = TODAY
source.channels[0] = { platform: 'Facebook', status: 'Đã đăng', postDate: TODAY, publishedAt: TODAY, time: '17:00', link: 'https://example.com/live' }
const id = duplicateContent(project, 2, source.id, 'account', 'Tester')
const copy = project.cycles[1].contents.find(item => item.id === id)
assert.notEqual(copy.id, source.id); assert.equal(copy.stt, 5); assert.equal(copy.stage, 'Ý tưởng'); assert.equal(copy.mainIdea, source.mainIdea)
assert.equal(copy.planSections[0].body, source.planSections[0].body); assert.notEqual(copy.planSections[0].id, source.planSections[0].id)
assert.deepEqual(copy.planHidden, source.planHidden); assert.deepEqual(copy.planLabels, source.planLabels)
assert.equal(copy.postDate, ''); assert.equal(copy.deadlineScript, ''); assert.equal(copy.deadlineEdit, ''); assert.equal(copy.mediaLink, ''); assert.equal(copy.sourceLink, '')
assert.equal(copy.publishedAt, undefined); assert.equal(copy.cancellation, undefined); assert.equal(copy.workflow.phase, 'draft'); assert.equal(copy.workflow.history.length, 0)
assert.deepEqual(copy.assignees, { content: [], media: [] }); assert.equal(copy.channels[0].status, 'Chưa lên lịch'); assert.equal(copy.channels[0].link, '')
assert.throws(() => duplicateContent(project, 2, post.id, 'partner', 'Content nội bộ'), /quyền/)
project.cycles[1].status = 'closed'
assert.throws(() => duplicateContent(project, 2, post.id, 'account', 'Tester'), /quyền/)
assert.throws(() => editBriefCell(project, 2, post.id, 'title', 'Closed', 'account', 'Tester'), /chốt/)
project.cycles[1].status = 'running'
project.quota.posts = 2
assert(duplicateContent(project, 2, post.id, 'account', 'Tester'))
assert(project.cycles[1].contents.at(-1).bonus)
const memory = new Map(); global.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
const store = require('../src/store/store.ts')
project.quota = { ...project.quota, shoots: 0, plans: 0, brandPosts: 1, salesPosts: 1 }
project.cycles.forEach(cycle => Object.assign(cycle, { timeline: [], shootings: [], plannedEnd: '2026-09-30', actualEnd: '', plan: { status: 'draft', link: '', sentAt: '', approvedAt: '', feedback: '' }, demo: { status: 'Chưa gửi', link: '', sentAt: '', approvedAt: '' } }))
store.update(draft => { draft.projects = [project] })
delete require.cache[require.resolve('../src/store/store.ts')]
const persisted = require('../src/store/store.ts').getData().projects[0]
assert.equal(persisted.cycles[1].contents[0].mainIdea, post.mainIdea)
assert.equal(persisted.cycles[1].contents.find(item => item.id === id).workflow.phase, 'draft')
assert.equal(contentPackages([persisted], 'account', 'Tester').find(entry=>entry.cycle.no===1).planned, 12)
console.log('PASS: package quotas/history, gifted/cancelled posts, scoped aggregates, guarded inline edits, clean duplicates and reload persistence.')
