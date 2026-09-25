import { useApp } from './context'

export function LoginOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useApp()
  const finish = (message: string) => {
    onClose()
    toast(message)
  }
  return (
    <div className={'login-overlay' + (open ? ' open' : '')} role="dialog" aria-modal="true">
      <form className="login-card" onSubmit={(event) => { event.preventDefault(); finish('Đăng nhập thành công vào prototype.') }}>
        <div className="login-brand"><div className="brand-mark">S</div><b>Smart CKHUB</b></div>
        <h1>Đăng nhập</h1>
        <p>Truy cập không gian vận hành theo vai trò được phân quyền.</p>
        <label className="field">Email<input type="email" defaultValue="account@smartckhub.local" required /></label>
        <label className="field">Mật khẩu<input type="password" defaultValue="SmartCKHUB" required autoFocus={open} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--muted)', fontSize: 12 }}><input type="checkbox" defaultChecked /> Duy trì đăng nhập</label>
        <button className="primary" type="submit">Đăng nhập</button>
        <div className="login-sep">hoặc</div>
        <button className="secondary" type="button" onClick={() => finish('Đăng nhập SSO mô phỏng thành công.')}>Đăng nhập SSO</button>
        <div className="login-foot">
          <button type="button" onClick={() => toast('Đã gửi hướng dẫn đặt lại mật khẩu tới email mô phỏng.')}>Quên mật khẩu?</button>
          <button type="button" onClick={onClose}>Quay lại prototype</button>
        </div>
      </form>
    </div>
  )
}
