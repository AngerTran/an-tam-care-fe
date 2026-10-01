# Đề xuất bổ sung ERD (để nhóm duyệt)

FE đang mock theo ERD 21 bảng của nhóm, cộng thêm các phần dưới đây vì một số màn hình cần dữ liệu mà ERD chưa có.
Kiểu dữ liệu tương ứng nằm trong `src/types/models.ts`, có đánh dấu "đề xuất".

```dbml
// Gia đình báo nghỉ (màn Family "Báo nghỉ", Manager CM-21 "Duyệt báo nghỉ")
Table absence_requests {
  absence_request_id bigint [pk, increment]
  elderly_member_id bigint [ref: > elderly_members.elderly_member_id]
  requested_by bigint [ref: > users.user_id]
  from_date date
  to_date date
  reason varchar(50)
  note text
  status varchar(30) // PENDING / APPROVED / REJECTED
  reviewed_by bigint [ref: > users.user_id]
  created_at datetime
}

// Cài đặt trung tâm + kiến thức cho trợ lý AI (Manager CM-24)
Table center_settings {
  center_id bigint [pk, ref: - centers.center_id]
  opening_hours varchar(150)
  pickup_policy text
  refund_policy text
  faqs json // [{ q, a }]
  ai_enabled boolean
  vnpay_connected boolean
  momo_connected boolean
}

// Cấu hình nền tảng (Admin AD-08)
Table system_settings {
  id int [pk]
  vnpay_mode varchar(20)
  momo_mode varchar(20)
  session_timeout_minutes int
  lock_after_failed_logins boolean
  llm_daily_token_limit int
  llm_mask_personal_data boolean
  email_enabled boolean
  push_enabled boolean
}
```

Thêm vào bảng có sẵn:

| Bảng | Cột | Lý do |
|---|---|---|
| `messages` | `channel varchar(30)`: FAMILY_CENTER / CENTER_ADMIN / INTERNAL | Admin chỉ thấy kênh với trung tâm; chỉ Center Manager được nhắn Admin |
| `messages` | `assigned_staff_id bigint` (tuỳ chọn) | Nút "Chuyển cho nhân viên" ở Manager CM-15 |
| `elderly_members` | `assigned_staff_id bigint` | Staff chỉ thấy người cao tuổi được phân công |
| `elderly_members` | `health_tags` (hoặc tách bảng) | Hiển thị chip bệnh lý / dị ứng |
| `centers` | `district`, `contract_start`, `contract_end` | Tìm theo quận, Admin quản lý hợp đồng |
| `users` | `position varchar(50)` | Điều dưỡng / Hộ lý / Hoạt động viên |
| `care_logs` | `blood_pressure`, `temperature`, `lunch_portion`, `manager_note` | Màn ghi nhật ký và xử lý lưu ý |
| `shifts` | `label` (Sáng / Chiều / Cả ngày) | Hiển thị lưới xếp ca |
| `ai_shift_suggestions` | `conflict boolean` | Đánh dấu ca xung đột, không duyệt tự động |
| `refunds` | `requested_by bigint`, cho phép `processed_by` NULL khi đang REQUESTED | Gia đình gửi yêu cầu hoàn tiền trước khi Manager xử lý |
