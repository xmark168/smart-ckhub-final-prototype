# Smart CKHUB Prototype (React)

Bản React + TypeScript + Vite của prototype PoC Smart CKHUB, chuyển từ `../final_prototype` (HTML/JS thuần). Giao diện, dữ liệu mẫu và luồng nghiệp vụ giữ nguyên bản gốc.

## Chạy local

```powershell
npm install
npm run dev
```

```powershell
npm run build   # kiểm tra kiểu + build ra dist/
npm run lint
```

`dist/` build với đường dẫn tương đối, mở được từ GitHub Pages hoặc thư mục con.

## Cấu trúc

```
src/
  App.tsx              Khung app: vai trò, điều hướng màn hình, modal, toast
  app/                 Sidebar, thanh trên (breadcrumb, thông báo), màn đăng nhập, context
  screens/             Mỗi màn hình một file; customers/, projects/, contracts/ có modal riêng
  data/                Dữ liệu mẫu + quy tắc nghiệp vụ (thanh toán, công nợ, trạng thái)
  store/               Kiểu dữ liệu và store dùng chung, lưu vào localStorage
  lib/                 Định dạng ngày/tiền, icon, form helper, hook
  ui/Modal.tsx         Modal dùng chung
  styles/legacy.css    CSS gốc của final_prototype, giữ nguyên thứ tự cascade
  styles/overrides.css Chỉnh nhỏ thay cho inline style của bản cũ
```

## Khác với bản HTML gốc

- Dữ liệu (khách hàng, dự án, hợp đồng, gói dịch vụ, công việc, hồ sơ) lưu trên trình duyệt, tải lại trang không mất. Khôi phục dữ liệu mẫu tại **Cài đặt → Chung → Dữ liệu mô phỏng**.
- Sửa lịch thanh toán của hợp đồng giữ nguyên số đã thu từng đợt (bản gốc đưa về 0).
- Tạo nội dung / lịch shooting / công việc thêm dòng vào danh sách (bản gốc chỉ hiện thông báo).
- Breadcrumb hiển thị đúng cấp cho chi tiết khách hàng, dự án, chu kỳ; menu giữ mục cha khi ở màn chi tiết.
- Sửa chữ bị thay nhầm "Shooting Kế hoạch" → "Shooting Plan".

Ngày "hôm nay" cố định `2026-09-25` và Account đăng nhập mô phỏng là `Tuyền` (xem `src/lib/format.ts`) để dữ liệu mẫu có nghĩa.
