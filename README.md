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

## Đường dẫn

Mỗi trang có URL riêng dạng hash (`#/...`), chạy được cả khi mở `dist/` từ GitHub Pages hay thư mục thường.

| Trang | URL | Vai trò được mở |
|---|---|---|
| Tổng quan | `#/overview` | Account, BODs, Administrator |
| Khách hàng / chi tiết | `#/customers`, `#/customers/:id` | Account, BODs, Administrator |
| Dự án / chi tiết / chu kỳ | `#/projects`, `#/projects/:id`, `#/projects/:id/cycle` | Account, BODs, Administrator |
| Hợp đồng & công nợ | `#/contracts` | Account, BODs, Administrator |
| Bài đăng, Lịch shooting, Công việc | `#/posts`, `#/shootings`, `#/tasks` | Account, BODs, Administrator |
| Partner & năng lực | `#/partners` | Account, BODs, Administrator |
| Việc / Dự án / Lịch của Partner | `#/my-work`, `#/my-projects`, `#/my-schedule` | Partner, Administrator |
| Hàng chờ phê duyệt | `#/reviews` | BODs, Administrator |
| Quản trị, Tài liệu, Gói dịch vụ, Phân quyền | `#/admin`, `#/docs`, `#/services`, `#/access` | Administrator |
| Hồ sơ, Cài đặt | `#/profile`, `#/settings` | Tất cả |

- Danh sách phân trang bằng `?page=N` (ví dụ `#/projects?page=2`). Số trang sai hoặc vượt quá được tự sửa; đổi bộ lọc đưa về trang 1.
- Back/Forward của trình duyệt đi qua từng trang và từng trang danh sách. Quay lại danh sách từ menu giữ trang đang xem.
- Mở URL không đúng vai trò hiện màn "Không có quyền truy cập"; URL không tồn tại hiện "Không tìm thấy trang".
- Quyền và menu khai báo một chỗ trong `src/app/routes.ts`, đường dẫn trong `src/app/router.ts`.

## Cấu trúc

```
src/
  App.tsx              Khung app: vai trò, chọn trang theo URL, modal, toast
  app/                 router.ts (URL), routes.ts (quyền, menu, tiêu đề), Sidebar, Topbar, đăng nhập
  screens/             Mỗi trang một file *Screen.tsx, gom theo nhóm:
    overview/ customers/ projects/ contracts/ operations/
    partners/ partner/ reviews/ admin/ account/ system/
  data/                Dữ liệu mẫu + quy tắc nghiệp vụ (thanh toán, công nợ, trạng thái)
  store/               Kiểu dữ liệu và store dùng chung, lưu vào localStorage
  lib/                 Định dạng ngày/tiền, icon, form helper, phân trang theo URL, hook
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
