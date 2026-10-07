// Pure business checks and isolated store persistence; never touch user browser data.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const wf = require('../src/lib/contentWorkflow.ts')
const { contentTiming, contentAssignees } = require('../src/lib/content.ts')
const { parsePastedPlan, previewPlan, mapHeaders, mapExtraHeaders, PLAN_HEADERS } = require('../src/lib/contentExcel.ts')
const { applyContentImport, undoContentImport } = require('../src/lib/contentImport.ts')
const { TODAY } = require('../src/lib/format.ts')
const post = { id: 'post', stt: 1, title: 'Title', stage: 'Script', mainIdea: 'Hook', contentDirection: 'Line 1\nLine 2', format: 'Video', mission: 'Bán hàng', category: 'Review', topic: '', bonus: false, postDate: TODAY, deadlineScript: TODAY, deadlineEdit: TODAY, mediaLink: '', channels: [], assignees: { content: ['Content nội bộ'], media: ['Hải'] }, workflow: { revision: 1, phase: 'draft', history: [] } }
const project = { id: 'fixture', code: 'fixture', owner: 'Tester', state: 'active', members: [{ name: 'Tester', role: 'account', access: 'edit' }, { name: 'Content nội bộ', role: 'partner', access: 'edit' }, { name: 'Hải', role: 'partner', access: 'edit' }], quota: { posts: 6 }, cycles: [{ no: 1, status: 'running', contents: [post], activity: [] }] }
assert(wf.canWriteBrief('partner', 'Content nội bộ', project, 1, post))
assert(!wf.canWorkOnPost('partner', 'Content nội bộ', project, 1, post, 'manage'))
assert(!wf.canWorkOnPost('partner', 'Hải', project, 1, post, 'content'))
project.members[1].access = 'view'; assert(!wf.canWriteBrief('partner', 'Content nội bộ', project, 1, post)); project.members[1].access = 'edit'
assert(!wf.visibleToPost('partner', 'Như', project, post))
wf.setPublication(post, [{ platform: 'Facebook', status: 'Chưa lên lịch', postDate: TODAY, time: '17:00', link: '' }], 'Tester'); assert.equal(post.stage, 'Script'); assert(!post.publishedAt)
wf.transitionPost(post, 'submit-content', 'Content nội bộ')
assert.equal(post.workflow.phase, 'content-review'); assert(!wf.canWriteBrief('partner', 'Content nội bộ', project, 1, post))
assert.throws(() => wf.transitionPost(post, 'request-content', 'Tester'), /phản hồi/)
wf.transitionPost(post, 'request-content', 'Tester', 'Change hook')
assert.equal(post.workflow.revision, 2); post.mainIdea = 'New hook'
assert.equal(JSON.parse(post.workflow.history[0].snapshot).mainIdea, 'Hook')
wf.transitionPost(post, 'submit-content', 'Content nội bộ'); wf.transitionPost(post, 'approve-content', 'Tester')
assert.equal(post.stage, 'Dựng')
assert.throws(() => wf.transitionPost(post, 'submit-media', 'Hải'), /link/)
post.mediaLink = 'https://example.com/v2'; wf.transitionPost(post, 'submit-media', 'Hải')
wf.transitionPost(post, 'request-media', 'Tester', 'Fix logo'); assert.equal(post.workflow.revision, 3)
post.mediaLink = 'https://example.com/v3'; wf.transitionPost(post, 'submit-media', 'Hải')
assert.throws(() => wf.transitionPost(post, 'approve-client', 'Tester', '', '2099-01-01'), /Ngày/)
assert.throws(() => wf.setPublication(post, [{ platform: 'Facebook', status: 'Đã lên lịch' }], 'Tester'), /duyệt/)
wf.transitionPost(post, 'approve-client', 'Tester', 'Approved over chat', TODAY)
const channels = [{ platform: 'Facebook', status: 'Đã đăng', postDate: TODAY, publishedAt: TODAY, time: '17:00', link: 'https://example.com/facebook' }, { platform: 'TikTok', status: 'Đã lên lịch', postDate: '2026-09-26', time: '18:00', link: '' }]
wf.setPublication(post, channels, 'Tester'); assert.equal(post.stage, 'Lên lịch'); assert(!post.publishedAt); assert.equal(contentTiming(post), 'Chưa đến hạn')
assert.throws(() => wf.setPublication(post, [channels[1]], 'Tester'), /Giữ/)
assert.throws(() => wf.transitionPost(post, 'revise', 'Tester'), /xuất bản/)
assert.throws(() => wf.setPublication(post, [{ ...channels[0], link: 'javascript:alert(1)' }, channels[1]], 'Tester'), /Link|link/)
const complete = [channels[0], { ...channels[1], status: 'Đã đăng', postDate: '2026-09-24', publishedAt: TODAY, link: 'https://example.com/tiktok' }]
wf.setPublication(post, complete, 'Tester'); assert.equal(post.stage, 'Đã đăng'); assert.equal(post.publishedAt, TODAY); assert.equal(contentTiming(post), 'Trễ hạn')
assert.equal(post.postDate, '2026-09-24')
assert(post.workflow.history.some((event) => event.action === 'Điều chỉnh lịch đăng' && JSON.parse(event.snapshot).channels[1].postDate === '2026-09-26'))
assert(!wf.canWriteBrief('account', 'Tester', project, 1, post))
const legacy = { ...structuredClone(post), workflow: undefined, stage: 'Lên lịch', channels: [{ platform: 'Facebook', status: 'Đã lên lịch', postDate: TODAY, time: '17:00', link: '' }] }
wf.logContent(legacy, 'Tester', 'Cập nhật phân công'); assert(legacy.workflow.legacy)
wf.setPublication(legacy, [{ ...legacy.channels[0], postDate: '2026-09-26' }], 'Tester'); assert(legacy.workflow.legacy); assert(wf.canRecordPublication(legacy))
wf.transitionPost(legacy, 'revise', 'Tester'); assert(!legacy.workflow.legacy); assert(!wf.canRecordPublication(legacy))
const restored = structuredClone(project); restored.cycles[0].contents = [{ ...structuredClone(legacy), id: 'import-post', channels: [], assignees: { content: [], media: [] } }]
const old = structuredClone(restored.cycles[0].contents[0])
const rows = [ [...PLAN_HEADERS, 'Content phụ trách', 'Ngày đăng', 'Thoại Talent'], ['1', 'Bán hàng', 'Review', 'New title', 'Hook', 'Body', 'Visual', 'Video', old.id, 'Content nội bộ', '24/09/2026', 'Talent line'] ]
const mapping = mapHeaders(rows[0]), extra = mapExtraHeaders(rows[0], mapping)
const preview = previewPlan(rows, 1, mapping, restored.cycles[0].contents, extra)
assert.equal(preview[0].error, ''); assert.equal(preview[0].values.postDate, '2026-09-24'); assert.equal(preview[0].values.planSections.length, 1)
applyContentImport(restored, 1, preview, 'Tester'); assert.equal(restored.cycles[0].contents[0].assignees.content[0], 'Content nội bộ')
const batch = restored.cycles[0].contentImports[0]
undoContentImport(restored, 1, batch.id, 'Tester'); assert.deepEqual(restored.cycles[0].contents[0], old)
applyContentImport(restored, 1, preview, 'Tester'); const newest = restored.cycles[0].contentImports[0]; restored.cycles[0].contents[0].mainIdea = 'Later edit'
assert.throws(() => undoContentImport(restored, 1, newest.id, 'Tester'), /sửa hoặc bàn giao/)
const invalid = structuredClone(preview); invalid[0].values.assignees.content = ['Uninvited']; assert.throws(() => applyContentImport(restored, 1, invalid, 'Tester'), /quyền dự án/)
assert.deepEqual(parsePastedPlan('A\tB\r\n"line 1\nline 2"\t"say ""Hi"""'), [['A','B'], ['line 1\nline 2', 'say "Hi"']])
assert.throws(() => parsePastedPlan('"unclosed'), /chưa đóng/)
const memory = new Map(); global.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
const store = require('../src/store/store.ts'); const seed = store.createSeed()
const running = seed.projects.find((entry) => entry.state === 'active' && entry.cycles.some((cycle) => cycle.status === 'running' && cycle.contents.length)); const cycle = running.cycles.find((entry) => entry.status === 'running'); const migrated = cycle.contents[0]
delete migrated.assignees
const source = `${running.id}:c${cycle.no}:${migrated.id}:script`
seed.tasks.push({ id: 'legacy-done', source, projectId: running.id, status: 'done', doneAt: '2020-01-01', assignee: 'Content nội bộ', due: TODAY })
wf.normalizeContentData(seed); assert.deepEqual(migrated.assignees.content, ['Content nội bộ'])
seed.tasks = []; assert.equal(contentAssignees(seed.tasks, running.id, cycle.no, migrated.id, migrated).content, 'Content nội bộ')
store.update((draft) => { draft.projects = seed.projects; draft.tasks = seed.tasks })
const saved = JSON.parse(memory.get('smart-ckhub-data')); assert(saved.projects.find((entry) => entry.id === running.id).cycles.find((entry) => entry.no === cycle.no).contents[0].assignees.content.includes('Content nội bộ'))
delete require.cache[require.resolve('../src/store/store.ts')]
const reload = require('../src/store/store.ts'); assert.equal(reload.getData().projects.find((entry) => entry.id === running.id).cycles.find((entry) => entry.no === cycle.no).contents[0].assignees.content[0], 'Content nội bộ')
const { syncTasks } = require('../src/data/tasks.ts')
const tasksData = reload.getData(); const savedPost = tasksData.projects.find((entry) => entry.id === running.id).cycles.find((entry) => entry.no === cycle.no).contents[0]
savedPost.stage = 'Script'; savedPost.workflow = { phase: 'content-review', revision: 1, history: [] }; syncTasks(tasksData)
assert(tasksData.tasks.some((task) => task.source === source.replace(/:script$/, ':review-content') && task.status === 'open'))
savedPost.stage = 'Đã hủy'; syncTasks(tasksData); assert(!tasksData.tasks.some((task) => task.source?.startsWith(source.slice(0,-6)) && task.status === 'open'))
const oldSaved = JSON.parse(memory.get('smart-ckhub-data'))
const oldProject = oldSaved.projects.find((entry) => entry.id === running.id), oldCycle = oldProject.cycles.find((entry) => entry.no === cycle.no), oldItem = oldCycle.contents[0]
oldItem.stage = 'Đã đăng'; delete oldItem.assignees; delete oldItem.workflow
oldSaved.tasks = [{ id: 'old-script', source, projectId: running.id, title: 'Old task', role: 'Creative', due: TODAY, status: 'done', doneAt: '2020-01-01', assignee: 'Content nội bộ' }]
memory.set('smart-ckhub-data', JSON.stringify(oldSaved)); delete require.cache[require.resolve('../src/store/store.ts')]
const oldReload = require('../src/store/store.ts').getData()
assert.equal(oldReload.projects.find((entry) => entry.id === running.id).cycles.find((entry) => entry.no === cycle.no).contents[0].assignees.content[0], 'Content nội bộ')
assert(!oldReload.tasks.some((task) => task.id === 'old-script')); assert.equal(oldReload.projects.length, oldSaved.projects.length)
console.log('PASS: role grants, assignment migration/persistence, review revisions/snapshots, per-channel actual dates, immutable published channels, legacy flow, Excel mapping/undo and synced reminders.')
