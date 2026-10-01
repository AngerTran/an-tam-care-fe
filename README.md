# An Tâm Care — Web FE

FE cho đồ án GFA26SE152 "Day-Care Elderly Service Management Platform". Giao diện theo file Figma `QvWs8Ya8umXc7CxJxGmp8X` (Page 2 + Components).

- React 19, Vite, TypeScript, Tailwind CSS v4
- React Router, TanStack Query, React Hook Form + Zod
- Icon Lucide, font Poppins
- **Backend chưa có**: toàn bộ API là mock trong `src/api` + `src/mock`, dữ liệu lưu ở localStorage

## Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:5173. Màn đăng nhập có nút điền nhanh tài khoản demo (mật khẩu `demo1234`) và nút "Khôi phục dữ liệu demo".

| Vai trò | Email |
|---|---|
| Center Manager | mai.tran@hoasen.vn |
| Caregiver / Staff | hanh.le@hoasen.vn |
| Family Member | lan.nguyen@gmail.com |
| Administrator | admin@antamcare.vn |

## Cấu trúc

```
src/
  api/index.ts          mock API theo vai trò (đổi sang gọi HTTP khi có BE)
  mock/seed.ts, db.ts   dữ liệu mẫu theo ERD + lưu localStorage
  types/models.ts       kiểu dữ liệu theo ERD (+ phần đề xuất, xem docs/erd-proposal.md)
  auth/                 đăng nhập, phiên 30 phút, guard theo vai trò
  components/ui.tsx     Button, Badge, Chip, Field, Card, Table, Modal… (khớp Figma)
  components/layout/    Sidebar theo vai trò, top bar
  pages/{auth,manager,staff,admin,family,shared}
```

## Quy tắc phân quyền (đã áp dụng trong mock API)

- Admin chỉ làm việc với trung tâm, không thu tiền gia đình, chỉ nhắn với Center Manager.
- Center Manager thu tiền / duyệt hoàn tiền (VNPay, MoMo vào tài khoản trung tâm), duyệt gợi ý xếp ca AI.
- Staff chỉ thấy người cao tuổi và ca được trung tâm phân công.
- Một tài khoản Family quản lý nhiều người thân.

Khi có backend: giữ nguyên chữ ký các hàm trong `src/api/index.ts`, thay thân hàm bằng `fetch` tới API thật.
