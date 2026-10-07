// Business regression checks run in isolated memory; no browser storage is touched.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename)
}
const memory = new Map()
global.localStorage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
const src = (file) => path.join(__dirname, '../src', file)
const store = require(src('store/store.ts'))
const logic = require(src('data/contracts.ts'))
const { syncTasks } = require(src('data/tasks.ts'))
const { renewalDue } = require(src('screens/customers/customerLogic.ts'))
const seed = store.createSeed()
const project = structuredClone(seed.projects.find((item) => !item.quota.once && item.state === 'active'))
const original = structuredClone(seed.contracts.find((row) => row.projectId === project.id && row.isPrimary))
project.cycles = project.cycles.slice(0, 1)
project.cycles[0].no = 1
project.cycles[0].start = '2026-09-01'
project.state = 'active'
const framework = { ...original, id: 'framework-check', kind: 'Nguyên tắc', firstCycle: 1, start: '2026-09-01', end: '', monthlyValue: 1000000, value: 1000000, paid: 0, payments: [{ installment: 1, percent: 100, amount: 1000000, due: '2026-09-01', paid: 0 }], status: 'Hiệu lực', activity: [] }
logic.syncFrameworkPayments([framework], [project])
assert.equal(framework.payments.length, 1)
assert.equal(renewalDue(project, framework, [framework]), false)
assert.equal(logic.canOpenContractCycle(framework, project, '2030-01-01', [framework]), true)
project.cycles.push({ ...structuredClone(project.cycles[0]), no: 2, start: '2026-10-03' })
logic.syncFrameworkPayments([framework], [project])
logic.syncFrameworkPayments([framework], [project])
assert.equal(framework.payments.length, 2, 'reload/sync must not bill a cycle twice')
assert.equal(framework.payments[1].due, '2026-10-03', 'billing follows service cycle, not calendar month')
assert.equal(framework.value, 2000000)
framework.monthlyValue = 1200000
project.cycles.push({ ...structuredClone(project.cycles[0]), no: 3, start: '2026-11-05' })
logic.syncFrameworkPayments([framework], [project])
assert.equal(framework.payments[0].amount, 1000000, 'new cycle price does not rewrite old charges')
assert.equal(framework.payments[2].amount, 1200000)
const service = { ...original, id: 'service-check', kind: 'Dịch vụ', firstCycle: 1, start: '2026-09-01', end: '30.09.2026', cycles: 1, status: 'Hiệu lực' }
assert.equal(logic.canOpenContractCycle(service, project, '2026-10-01', [service]), false)
const appendix = { ...service, id: 'appendix-check', type: 'Phụ lục', isPrimary: false, parentContractId: service.id, extensionMonths: 3, start: '2026-10-01', end: '31.12.2026' }
assert.deepEqual(logic.contractTerm(service, [service, appendix]), { cycles: 4, end: '31.12.2026' })
assert.equal(service.cycles, 1, 'signed original term remains intact')
assert.equal(logic.canOpenContractCycle(service, project, '2026-12-01', [service, appendix]), true)
assert.equal(logic.canOpenContractCycle(service, project, '2027-01-01', [service, appendix]), false)
appendix.status = 'Nháp'
assert.equal(logic.contractTerm(service, [service, appendix]).cycles, 1, 'unsigned appendix cannot extend contract')
appendix.status = 'Đã hủy'
assert.equal(logic.contractTerm(service, [service, appendix]).cycles, 1)
const renewal = { ...service, id: 'renewal-check', firstCycle: 4, cycles: 3, start: '2026-12-01', end: '28.02.2027' }
logic.syncProjectContract(project, [renewal])
assert.equal(project.total, 6, 'new contract grants cycles after previous work')
assert.equal(logic.canOpenContractCycle(renewal, project, '2026-12-01', [renewal]), true)
const historical = { ...service, id: 'historical-check', status: 'Kết thúc' }
const pending = { ...renewal, status: 'Nháp' }
assert.equal(logic.primaryContract([pending, service, historical], project.id), service, 'draft renewal cannot replace effective contract')

// Stop preserves original paid invoices, pauses collection, then enables settlement/refund work.
project.state = 'stopped'
const settled = { ...service, value: 3000000, paid: 1500000, payments: [{ installment: 1, percent: 50, amount: 1500000, paid: 1500000, due: '2026-09-01', invoiced: true, evidence: 'UNC-OLD' }, { installment: 2, percent: 50, amount: 1500000, paid: 0, due: '2026-10-01' }], status: 'Kết thúc', settlement: { status: 'pending', stoppedAt: '2026-09-20', reason: 'Khách dừng sớm', transactions: [] } }
const history = JSON.stringify(settled.payments)
const testData = { ...seed, projects: [project], contracts: [settled], tasks: [{ id: 'old-pay', source: 'pay:' + settled.id + ':2', projectId: project.id, status: 'open', due: '2026-10-01', role: 'Kế toán', assignee: 'Kế toán', title: 'Thu cũ' }] }
syncTasks(testData)
assert.equal(testData.tasks.find((task) => task.id === 'old-pay').status, 'cancelled')
assert(testData.tasks.some((task) => task.source === 'settle:' + settled.id && task.status === 'open'), 'stopped project still produces finance work')
assert.equal(logic.collectionPayments(settled).length, 0)
settled.settlement = { ...settled.settlement, status: 'confirmed', agreedValue: 1000000, due: '2026-09-25', confirmedAt: '2026-09-21', evidence: 'AGREEMENT-1' }
assert.equal(logic.paymentMetrics(settled).refund, 500000)
assert.equal(logic.paymentMetrics(settled).remaining, 0)
syncTasks(testData)
assert(testData.tasks.some((task) => task.source === 'refund:' + settled.id && task.status === 'open'))
settled.settlement.transactions.push({ kind: 'refund', amount: 500000, date: '2026-09-25', evidence: 'UNC-REFUND' })
assert.equal(logic.cashReceived(settled), 1000000)
assert.equal(logic.paymentMetrics(settled).refund, 0)
syncTasks(testData)
assert.equal(testData.tasks.find((task) => task.source === 'refund:' + settled.id).status, 'done')
assert.equal(testData.tasks.find((task) => task.source === 'settle:' + settled.id).status, 'done')
settled.settlement.agreedValue = 2000000
assert.equal(logic.paymentMetrics(settled).remaining, 1000000)
settled.settlement.transactions.push({ kind: 'receipt', amount: 1000000, date: '2026-09-25', evidence: 'UNC-NEW' })
assert.equal(logic.paymentMetrics(settled).remaining, 0)
syncTasks(testData)
assert(testData.tasks.some((task) => task.source === 'invsett:' + settled.id + ':1' && task.status === 'open'))
assert.equal(JSON.stringify(settled.payments), history, 'settlement never rewrites original receipts or invoices')
assert.equal(logic.canOpenContractCycle(settled, project, '2026-09-25', [settled]), false)

// Real modal guards: Account cannot confirm; accountant with revoked access cannot confirm.
const react = require('react')
react.useState = (initial) => [typeof initial === 'function' ? initial() : initial, () => {}]
store.useData = () => store.getData()
let session = { role: 'accountant', account: 'Kế toán', closeModal() {}, toast() {} }
require(src('app/context.ts')).useApp = () => session
const { SettlementModal } = require(src('screens/contracts/SettlementModal.tsx'))
const form = (values) => ({ elements: { namedItem: (name) => values[name] == null ? null : { value: String(values[name]) } } })
store.update((draft) => { draft.projects = [project]; draft.contracts = [structuredClone(settled)]; draft.contracts[0].settlement = { status: 'pending', stoppedAt: '2026-09-20', reason: 'Dừng', transactions: [] }; draft.projects[0].members = [{ name: 'Kế toán', role: 'accountant', access: 'view' }, { name: 'Hiền', role: 'account', access: 'edit' }] })
session = { ...session, role: 'account', account: 'Hiền' }
SettlementModal({ contractId: settled.id }).props.onSubmit(form({ evidence: 'CONFIRM', date: '2026-09-25', due: '2026-09-25' }))
assert.equal(store.getData().contracts[0].settlement.status, 'pending')
session = { ...session, role: 'accountant', account: 'Kế toán' }
const staleForm = SettlementModal({ contractId: settled.id })
store.update((draft) => { draft.projects[0].members = [] })
staleForm.props.onSubmit(form({ evidence: 'CONFIRM', date: '2026-09-25', due: '2026-09-25' }))
assert.equal(store.getData().contracts[0].settlement.status, 'pending', 'live project grant checked at save')
store.update((draft) => { draft.projects[0].members = [{ name: 'Kế toán', role: 'accountant', access: 'view' }] })
SettlementModal({ contractId: settled.id }).props.onSubmit(form({ evidence: 'CONFIRM', date: '2026-09-25', due: '2026-09-25' }))
assert.equal(store.getData().contracts[0].settlement.status, 'confirmed')
assert.equal(JSON.stringify(store.getData().contracts[0].payments), history)

// Actual create/stop form handlers connect the data model to the UI.
const { ContractFormModal } = require(src('screens/contracts/ContractModals.tsx'))
const { StopProjectModal } = require(src('screens/projects/ProjectModals.tsx'))
session = { ...session, role: 'account', account: 'Hiền' }
store.update((draft) => { draft.projects[0].members.push({ name: 'Hiền', role: 'account', access: 'edit' }) })
let hookIndex = 0
react.useState = (initial) => [hookIndex++ === 5 ? 'Nguyên tắc' : typeof initial === 'function' ? initial() : initial, () => {}]
ContractFormModal({ preferredProjectId: project.id }).props.onSubmit(form({ project: project.id, type: 'Hợp đồng chính', code: 'NT-CHECK', start: '2026-09-25', status: 'Hiệu lực' }))
const created = store.getData().contracts.find((row) => row.code === 'NT-CHECK')
assert(created, 'framework can be saved from actual form')
assert.equal(created.kind, 'Nguyên tắc')
assert.equal(created.end, '')
assert.equal(created.firstCycle, 4)
assert.equal(created.payments.length, 1)
assert.equal(created.payments[0].percent, 100)
react.useState = (initial) => [typeof initial === 'function' ? initial() : initial, () => {}]
const currentProject = store.getData().projects[0]
StopProjectModal({ project: currentProject }).props.onSubmit({ elements: { namedItem: (name) => ({ value: ({ effectiveDate: '2026-09-25', reason: 'Dừng thử' })[name] ?? '', checked: name === 'endContract' }) } })
assert.equal(store.getData().projects[0].state, 'stopped')
assert.equal(store.getData().contracts.find((row) => row.id === created.id).settlement.status, 'pending')
assert(store.getData().tasks.some((task) => task.source === 'settle:' + created.id && task.status === 'open'))

// Persist framework + new fields; load legacy data without reset or receipt changes.
store.update((draft) => { draft.contracts.push(framework) })
delete require.cache[require.resolve(src('store/store.ts'))]
let reloaded = require(src('store/store.ts'))
assert.equal(reloaded.getData().contracts.find((row) => row.id === framework.id).monthlyValue, 1200000)
assert.equal(reloaded.getData().contracts.find((row) => row.id === settled.id).settlement.evidence, 'CONFIRM')
const legacy = structuredClone(reloaded.getData())
const legacyContract = legacy.contracts.find((row) => row.id === settled.id)
delete legacyContract.kind
delete legacyContract.firstCycle
delete legacyContract.issuesVat
memory.set('smart-ckhub-data', JSON.stringify(legacy))
delete require.cache[require.resolve(src('store/store.ts'))]
reloaded = require(src('store/store.ts'))
const loadedContract = reloaded.getData().contracts.find((row) => row.id === settled.id)
assert.equal(loadedContract.kind, 'Dịch vụ')
assert.equal(loadedContract.issuesVat, true)
assert.equal(JSON.stringify(loadedContract.payments), history)
assert.deepEqual(reloaded.getData().projects[0].members, legacy.projects[0].members)
console.log('Contract lifecycle checks passed: cycle billing, terms, appendices, renewals, settlement, finance tasks, permission guards, persistence and legacy data.')
