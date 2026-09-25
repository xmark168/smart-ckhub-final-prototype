import { useApp } from '../../app/context'
import { Icon } from '../../lib/icons'
import { useData } from '../../store/store'
import { CycleTaskModal, DemoModal, ExceptionModal, PlanModal, PostsModal, ShootingModal } from './CycleModals'
import { cycleDataFor, cycleRange, planLabel, statusTone } from './projectLogic'

export function CycleWorkspace() {
  const { projectId, go, toast, showModal } = useApp()
  const project = useData().projects.find((item) => item.id === projectId)
  if (!project) {
    return (
      <section className="screen active" id="cycleWorkspace">
        <div className="cycle-head"><div><button className="project-detail-back" onClick={() => go('projects')}><Icon name="arrow-left" /> Dự án</button><p>Không tìm thấy dự án.</p></div></div>
      </section>
    )
  }

  const cycle = cycleDataFor(project)
  const completed = cycle.tasks.filter((task) => task.status === 'Đã hoàn thành').length
  const needsAttention = cycle.exceptions.length > 0 || cycle.tasks.some((task) => task.status !== 'Nháp' && (!task.owner || !task.deadline))
  const shootingLocked = cycle.plan.status !== 'approved'
  const range = cycleRange(project)
  const planText = planLabel(cycle.plan.status)

  return (
    <section className="screen active" id="cycleWorkspace">
      <div className="cycle-head">
        <div>
          <button className="project-detail-back" onClick={() => go('projectDetail')}><Icon name="arrow-left" /> Dự án</button>
          <h1>Chu kỳ {project.cycle} / {project.total}</h1>
          <p>{project.customer} · {range}</p>
        </div>
        <button className="secondary" onClick={() => showModal(<ExceptionModal project={project} />)}><Icon name="flag" /> Ghi nhận ngoại lệ</button>
      </div>

      <section className="cycle-rail">
        <div><span>Bắt đầu</span><b>{range.split(' – ')[0]}</b></div>
        <i />
        <div><span>Kết thúc dự kiến</span><b>{project.due}</b></div>
        <i />
        <div><span>Kết thúc thực tế</span><b>{project.actualEnd || 'Chưa ghi nhận'}</b></div>
        <div className={'cycle-health' + (needsAttention ? ' attention' : '')}><span>Sức khỏe</span><b>{needsAttention ? 'Cần theo dõi' : 'Đúng tiến độ'}</b></div>
      </section>

      <div className="cycle-layout">
        <main>
          <section className="panel cycle-panel">
            <div className="panel-head">
              <div><h2>Content Plan</h2><p className="subline">Hạn gửi khách: T0 + 3 ngày làm việc.</p></div>
              <span className={'cycle-status ' + statusTone(planText)}>{planText}</span>
            </div>
            <dl className="cycle-definition">
              <div><dt>Phiên bản</dt><dd>v{cycle.plan.version}</dd></div>
              <div><dt>Đã gửi</dt><dd>{cycle.plan.sentAt || 'Chưa gửi'}</dd></div>
              <div><dt>Đã duyệt</dt><dd>{cycle.plan.approvedAt || 'Chưa duyệt'}</dd></div>
            </dl>
            {cycle.plan.feedback && <p className="cycle-note">{cycle.plan.feedback}</p>}
            <button className="text-btn" onClick={() => showModal(<PlanModal project={project} />)}>Cập nhật Content Plan</button>
          </section>

          <section className="panel cycle-panel">
            <div className="panel-head">
              <div><h2>Công việc chu kỳ</h2><p className="subline">Owner và deadline là điều kiện để bắt đầu.</p></div>
              <button className="text-btn" onClick={() => showModal(<CycleTaskModal project={project} />)}>+ Công việc</button>
            </div>
            <div className="cycle-task-list">
              {cycle.tasks.map((task) => (
                <button className="cycle-task" key={task.id} onClick={() => showModal(<CycleTaskModal project={project} task={task} />)}>
                  <span><b>{task.name}</b><small>{task.owner || 'Chưa giao'} · {task.deadline || 'Chưa có hạn'}</small></span>
                  <em className={'cycle-status ' + statusTone(task.status)}>{task.status}</em>
                </button>
              ))}
            </div>
            <div className="cycle-foot">Hoàn thành <b>{completed} / {cycle.tasks.length}</b> công việc</div>
          </section>

          <section className="panel cycle-panel">
            <div className="panel-head"><div><h2>Nhật ký chu kỳ</h2><p className="subline">Dấu vết thay đổi mốc và đầu ra.</p></div></div>
            <div className="cycle-log">
              {cycle.activity.slice(0, 5).map((log, index) => (
                <div key={index}><Icon name="clock-3" /><span><b>{log.title}</b><small>{log.detail} · {log.time}</small></span></div>
              ))}
            </div>
          </section>
        </main>

        <aside>
          <section className="panel cycle-panel">
            <div className="panel-head">
              <div><h2>Shooting Plan</h2><p className="subline">Chỉ tạo sau khi khách duyệt Plan.</p></div>
              <span className={'cycle-status ' + (shootingLocked ? 'muted' : 'info')}>{shootingLocked ? 'Đang khóa' : cycle.shootings.length + ' lịch'}</span>
            </div>
            <div className="cycle-compact-list">
              {cycle.shootings.length
                ? cycle.shootings.map((shooting, index) => <div key={index}><b>{shooting.date}</b><small>{shooting.media} · {shooting.status}</small></div>)
                : <p className="empty-copy">Chưa có lịch shooting trong chu kỳ.</p>}
            </div>
            <button
              className="text-btn"
              disabled={shootingLocked}
              onClick={() => (shootingLocked ? toast('Cần khách duyệt Content Plan trước khi tạo Shooting Plan.') : showModal(<ShootingModal project={project} />))}
            >
              Tạo lịch shooting
            </button>
          </section>

          <section className="panel cycle-panel">
            <div className="panel-head">
              <div><h2>Post Demo</h2><p className="subline">Gửi khách sau shoot 1 ngày làm việc.</p></div>
              <span className={'cycle-status ' + statusTone(cycle.demo.status)}>{cycle.demo.status}</span>
            </div>
            <p className="cycle-meta">Đã gửi: {cycle.demo.sentAt || 'Chưa gửi'} · Đã duyệt: {cycle.demo.approvedAt || 'Chưa duyệt'}</p>
            <button className="text-btn" onClick={() => showModal(<DemoModal project={project} />)}>Cập nhật Post Demo</button>
          </section>

          <section className="panel cycle-panel">
            <div className="panel-head"><div><h2>Bài đăng</h2><p className="subline">Phân phối mục tiêu 2–3 bài mỗi tuần.</p></div></div>
            <div className="cycle-post-progress"><b>{cycle.posts.actual} / {cycle.posts.planned}</b><span>đã xuất bản</span></div>
            <button className="text-btn" onClick={() => showModal(<PostsModal project={project} />)}>Cập nhật bài đăng</button>
          </section>

          <section className="panel cycle-panel">
            <div className="panel-head"><h2>Ngoại lệ</h2></div>
            <div className="cycle-compact-list">
              {cycle.exceptions.length
                ? cycle.exceptions.map((exception, index) => <div key={index}><b>{exception.type}</b><small>{exception.reason}</small></div>)
                : <p className="empty-copy">Không có ngoại lệ đang mở.</p>}
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}
