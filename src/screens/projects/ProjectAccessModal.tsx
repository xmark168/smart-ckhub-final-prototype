import { useState } from 'react'
import { ROLES, useApp } from '../../app/context'
import { ACCOUNTS } from '../../lib/format'
import { PARTNER_PEOPLE } from '../../lib/people'
import { canManageProjectAccess } from '../../lib/scope'
import { update, useData } from '../../store/store'
import type { ProjectMember } from '../../store/types'
import { Modal, Req } from '../../ui/Modal'

const PEOPLE: Record<ProjectMember['role'], string[]> = {
  account: ACCOUNTS, partner: PARTNER_PEOPLE, bods: ['BODs'], accountant: ['Kế toán'],
}

export function ProjectAccessModal({ projectId }: { projectId: string }) {
  const { role, account, toast } = useApp()
  const { projects } = useData()
  const project = projects.find((item) => item.id === projectId)
  const [memberRole, setMemberRole] = useState<ProjectMember['role']>('account')
  const [name, setName] = useState(ACCOUNTS[0])
  const [access, setAccess] = useState<ProjectMember['access']>('view')
  if (!project || !canManageProjectAccess(role, account, project)) return <Modal title="Phân quyền dự án"><p className="empty-copy">Bạn không có quyền quản lý thành viên dự án này.</p></Modal>
  const change = (member: ProjectMember, remove = false) => {
    if (role !== 'admin' && member.role === 'account' && member.name === project.owner && (remove || member.access !== 'edit')) {
      toast('Account phụ trách không thể tự thu hồi quyền quản lý.'); return
    }
    update((draft) => {
      const target = draft.projects.find((item) => item.id === projectId)
      if (!target || !canManageProjectAccess(role, account, target)) return
      // Owner cannot remove their own management access; Administrator can revoke it.
      if (role !== 'admin' && member.role === 'account' && member.name === target.owner && (remove || member.access !== 'edit')) return
      const members = target.members ?? []
      const index = members.findIndex((item) => item.role === member.role && item.name === member.name)
      if (remove) target.members = members.filter((_, i) => i !== index)
      else if (index >= 0) members[index] = member
      else members.push(member)
      if (!remove) target.members = members
      target.activities.unshift({ icon: 'shield-check', title: remove ? 'Thu hồi quyền dự án' : 'Cập nhật quyền dự án', detail: member.name + ' · ' + ROLES[member.role].label + ' · ' + (remove ? 'Đã thu hồi' : member.access === 'edit' ? 'Tham gia và chỉnh sửa' : 'Xem theo vai trò') })
    })
    toast(remove ? 'Đã thu hồi quyền dự án.' : 'Đã cập nhật quyền dự án.')
  }
  return <Modal title={'Phân quyền · ' + project.code} className="contract-modal">
    <div className="form">
      <p className="cd-note">{project.customer} · {project.service}. Nhân sự cần quyền dự án trước khi xem việc được giao. Administrator quản lý toàn bộ; thành viên xem theo giới hạn vai trò.</p>
      <div className="payment-account-list">
        {(project.members ?? []).map((member) => <div className="payment-account-card" key={member.role + ':' + member.name}>
          <b>{member.name} · {ROLES[member.role].label}</b>
          <span>{member.access === 'edit' ? 'Tham gia và chỉnh sửa' : member.role === 'partner' ? 'Xem công việc được giao' : member.role === 'accountant' ? 'Hợp đồng và khoản thu' : 'Chỉ xem'}</span>
          {(role === 'admin' || member.role !== 'account' || member.name !== project.owner) && <div className="payment-account-actions">
            {member.role === 'account' && <button type="button" className="text-btn" onClick={() => change({ ...member, access: member.access === 'edit' ? 'view' : 'edit' })}>{member.access === 'edit' ? 'Chuyển chỉ xem' : 'Cho chỉnh sửa'}</button>}
            <button type="button" className="text-btn" onClick={() => change(member, true)}>Thu hồi quyền</button>
          </div>}
        </div>)}
        {!project.members?.length && <p className="empty-copy">Chưa cấp quyền cho nhân sự nào.</p>}
      </div>
      <h3>Cấp quyền tham gia</h3>
      <label className="field">Vai trò<Req /><select value={memberRole} onChange={(event) => { const next = event.target.value as ProjectMember['role']; setMemberRole(next); setName(PEOPLE[next][0]); setAccess('view') }}>{Object.keys(PEOPLE).map((key) => <option key={key} value={key}>{ROLES[key as ProjectMember['role']].label}</option>)}</select></label>
      <label className="field">Nhân sự<Req /><select value={name} onChange={(event) => setName(event.target.value)}>{PEOPLE[memberRole].map((person) => <option key={person}>{person}</option>)}</select></label>
      {memberRole === 'account' && <label className="field">Quyền<Req /><select value={access} onChange={(event) => setAccess(event.target.value as ProjectMember['access'])}><option value="view">Chỉ xem</option><option value="edit">Tham gia và chỉnh sửa</option></select></label>}
      <div className="form-actions"><button type="button" className="primary" onClick={() => change({ name, role: memberRole, access: memberRole === 'account' ? access : 'view' })}>Cấp / cập nhật quyền</button></div>
    </div>
  </Modal>
}
