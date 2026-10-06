# An Tâm Care — Phân tích nghiệp vụ (bản 2)

> Bản này thay cho phân tích cũ (mô hình nhiều trung tâm). Chốt với nhóm ngày 05/10/2026.
> Những chỗ ghi **[ĐỀ XUẤT]** là mình tự đề xuất, nhóm cần duyệt. Những chỗ ghi **[HỎI]** đang chờ trả lời (mục 9).

## 1. Bối cảnh và phạm vi

- **Một doanh nghiệp tư nhân, một trung tâm**, mô hình **bán trú**: cụ đến buổi sáng, gia đình đón về buổi chiều. Không có nội trú, không có xe đưa đón.
- Trước đây doanh nghiệp quản lý bằng giấy tờ, điện thoại, tiền mặt. Nền tảng mới gồm:
  - **Web**: Admin và Center Manager quản lý; khách vãng lai xem gói, đăng ký, hỏi chatbot.
  - **App mobile**: Family (theo dõi cụ, thanh toán, nhắn tin) và Staff (xem lịch ca, ghi nhật ký).
- Thu phí trực tiếp từ gia đình qua cổng thanh toán (VNPay/MoMo). **Trả trước**, không cần tiền mặt.
- Hệ thống chỉ quản lý **chỉ số sức khỏe**, không quản lý bệnh án hay kê đơn. Ca nặng thì chuyển viện.
- Camera đặt ở khu sinh hoạt chung nhưng **không nối vào app**. Gia đình xem ảnh qua nhật ký chăm sóc (care log).
- Phạm vi ban đầu là một trung tâm. Thiết kế dữ liệu nên chừa đường để sau này mở thêm chi nhánh, nhưng không làm giao diện nhiều chi nhánh.

## 2. Khảo sát mô hình bán trú thực tế

| Nơi | Hình thức | Giá | Điểm học được |
|---|---|---|---|
| BV Phục hồi chức năng TP.HCM | Sáng đi chiều về, 8h–16h | 350–520k/ngày (BHYT đồng chi trả) | Lịch ngày chia khung giờ: đo sinh hiệu → tập phục hồi → nhận thức/tâm lý → ăn → trò chơi, âm nhạc → hướng dẫn tập ở nhà. Giá thay đổi theo dịch vụ thêm (tập robot) |
| Nhân Ái DayCare | Theo ngày; theo tháng 3 buổi/tuần (T2-4-6 hoặc T3-5-7); theo tháng 6 buổi/tuần (26 ngày, nghỉ CN) | Không công khai | Gói 3 buổi/tuần giúp cụ **làm quen dần**. Giờ 7h–17h. Hoạt động theo sức khỏe và tinh thần từng cụ |
| Hạnh Phúc Viên | Gói Hạnh Phúc / Gói Trọn Vẹn | 350–400k và 400–450k/ngày | Hai hạng gói. Phụ thu ngày lễ (300k) và Tết (500k). Đặt cọc bằng 1 tháng phí. Dịch vụ lẻ tính riêng |
| Thanh Xuân (Hà Nội) | Chăm sóc ban ngày | 400–600k/ngày | Giá thay đổi theo mức độ chăm sóc |
| Cơ sở công lập Đống Đa (Hà Nội) | Bán trú | 5,68tr/tháng | Gồm cơm trưa và quà chiều |
| Bình Mỹ (nội trú) | Gói theo bệnh: sau tai biến, sa sút trí tuệ, VLTL | 8–10tr/tháng | Chia **theo tình trạng bệnh**. Website không công khai giá (nhược điểm cần tránh) |

Kết luận: giá bán trú trên thị trường khoảng **350–600k/ngày**. Các nơi đều chia gói theo **ba trục**: thời hạn, hạng dịch vụ, tình trạng sức khỏe của cụ. Dịch vụ lẻ tính riêng.

## 3. Actor và nhiệm vụ

| Actor | Kênh | Nhiệm vụ chính | Không được làm |
|---|---|---|---|
| **Platform Administrator** (chủ doanh nghiệp, nhà đầu tư) | Web | Xem dashboard doanh thu, số cụ, tỷ lệ lấp chỗ, báo cáo Manager gửi. Quản lý tài khoản Manager. Cấu hình hệ thống: cổng thanh toán, AI, bảo mật. Xem nhật ký hệ thống | **[ĐỀ XUẤT]** Không xem hồ sơ sức khỏe chi tiết của từng cụ, chỉ xem số liệu tổng hợp. Không tham gia vận hành hằng ngày |
| **Center Manager** | Web | Tạo gói và đặt giá. Quản lý danh mục dịch vụ. Duyệt đăng ký và đối tượng (vận động được / cần hỗ trợ về bệnh). Quản lý cụ, gia đình, staff. Xếp ca (duyệt gợi ý của AI). Thực đơn (duyệt gợi ý của AI). Lịch hoạt động. Duyệt xin nghỉ, bảo lưu, chấm dứt hợp đồng. Xử lý cảnh báo và chuyển viện. Lập báo cáo gửi Admin | Không nhắn tin trực tiếp thay staff. Chỉ xem tin nhắn theo quy tắc ở BR-40 |
| **Staff – Điều dưỡng** | App (có thể dùng thêm web) | Xem lịch ca và các cụ được giao. Check-in/check-out cụ. **Đo và ghi chỉ số sức khỏe**. Nhận cảnh báo của AI. Ghi sự cố, đề xuất chuyển viện. Đánh giá đầu vào. Nhắn tin với gia đình các cụ mình phụ trách. Đăng ký lịch rảnh, xin nghỉ hoặc đổi ca | Không xem cụ không được giao. Không xem hóa đơn |
| **Staff – Hộ lý** | App | Xem lịch ca và các cụ được giao. Check-in/check-out. **Ghi ăn uống, vệ sinh, hoạt động, chụp ảnh** vào care log. Nhắn tin với gia đình. Đăng ký lịch rảnh, xin nghỉ | Không ghi chỉ số sức khỏe. Không đánh giá đầu vào |
| **Family Member** | App (và web) | Đăng ký một hoặc nhiều cụ. Chọn gói, thanh toán, gia hạn. Khai danh sách **người được phép đón**. Xem care log, ảnh, chỉ số sức khỏe, hóa đơn. Báo nghỉ. Nhắn tin với staff phụ trách. Hỏi chatbot | Không xem dữ liệu cụ của gia đình khác |
| **Payment Gateway** (VNPay/MoMo) | Hệ thống ngoài | Nhận yêu cầu thanh toán, trả kết quả qua callback (IPN), xử lý hoàn tiền khi có lệnh | — |
| **AI Service** (LLM) | Hệ thống ngoài | Gợi ý xếp ca, gợi ý thực đơn, chatbot tư vấn, cảnh báo sức khỏe bất thường | **Chỉ gợi ý.** Mọi quyết định do người duyệt |
| *Khách vãng lai* | Web | Xem gói và giá, hỏi chatbot, đặt lịch tham quan, tạo tài khoản Family | — |

Staff dùng **một bảng `staff_profiles`** gồm chức vụ (`NURSE` / `CAREGIVER`), chứng chỉ, ngày vào làm, trạng thái. Không có chức vụ trưởng ca. Nếu cần ghi chú ca thì dùng trường text `shift.note`.

## 4. Gói dịch vụ

Nguyên tắc: **ai mua gói nào thì được dùng tính năng của gói đó** (entitlement). Hệ thống tự bật hoặc tắt tính năng theo gói đang hiệu lực của từng cụ.

### 4.1 Ba trục tạo nên một gói

Gia đình chọn gói theo thứ tự **Thời hạn (Trục 1) → Đối tượng (Trục 3) → Hạng và dịch vụ (Trục 2)**. Ở mỗi bước, hệ thống chỉ hiện những lựa chọn phù hợp với các bước trước (mục 4.12).

**Trục 1: Thời hạn và tần suất**

| Mã | Tên | Cách tính | Báo nghỉ |
|---|---|---|---|
| `DAY` | Gói ngày | Đặt trước từng ngày, trả trước | **Không mất tiền** nếu báo nghỉ đúng hạn (BR-21) |
| `M3` | Tháng 3 buổi/tuần | 12–13 buổi/tháng, cố định T2-4-6 hoặc T3-5-7 | Vẫn tính tiền |
| `MONTH` | Gói tháng | **Đi cả tháng, trừ Chủ nhật** (thứ 2 đến thứ 7). Giá cố định một mức, không phụ thuộc tháng có bao nhiêu ngày **[ĐỀ XUẤT]** | Vẫn tính tiền |
| `Q` / `Y` | Quý / Năm | Như gói tháng, giảm giá 5% / 10% **[ĐỀ XUẤT]** | Vẫn tính tiền |

`DAY` phù hợp cho người đi ngắn hạn hoặc **đi thử**. `M3` dành cho cụ mới làm quen. `MONTH`, `Q`, `Y` là gói dài hạn.

**Trục 3: Đối tượng người cao tuổi (gia đình tự khai, điều dưỡng đánh giá, Manager duyệt)**

| Mã | Đối tượng | Mô tả | Phụ phí **[ĐỀ XUẤT]** | Ràng buộc **[ĐỀ XUẤT]** |
|---|---|---|---|---|
| `ACTIVE` | Người già vận động được | Tự đi lại, tự ăn, tự vệ sinh, hoặc chỉ cần nhắc nhở. Không có bệnh cần theo dõi đặc biệt | +0% | Mua được mọi hạng |
| `MEDICAL` | Người già cần hỗ trợ về bệnh | Có bệnh cần theo dõi hoặc chăm sóc thêm: sau tai biến, tiểu đường, cao huyết áp, tim mạch, đi lại khó cần dìu hoặc xe lăn | +30% | Chỉ mua từ hạng **Tiêu chuẩn** trở lên. Dùng ghế massage phải được **điều dưỡng cho phép** |

- Điều dưỡng chấm thang **Barthel (ADL)** khi đánh giá đầu vào. Barthel từ 61 trở lên **và** không có bệnh cần theo dõi thì xếp nhóm `ACTIVE`; còn lại xếp nhóm `MEDICAL`.
- Cụ đã từng được đánh giá thì ô đối tượng được **điền sẵn và khóa**, gia đình không tự đổi.
- Cụ **sa sút trí tuệ** có được nhận vào nhóm `MEDICAL` không? Cụ **nằm liệt giường hoàn toàn** có nhận không (đề xuất là không)? **[HỎI]**

**Trục 2: Hạng dịch vụ**

| Quyền lợi | Cơ bản | Tiêu chuẩn | Cao cấp |
|---|---|---|---|
| Giờ chăm sóc | 7h–16h30 | 7h–16h30 | 7h–16h30 |
| Bữa ăn | Trưa + xế | Sáng + trưa + xế | Sáng + trưa + xế, **thực đơn riêng theo bệnh lý** |
| Chỗ nghỉ trưa | Phòng chung | Phòng 4–6 người | **Phòng 2 người, giường riêng cố định** |
| Số cụ trên mỗi staff | 1:8 | 1:6 | 1:4 |
| Đo chỉ số sức khỏe | 1 lần/ngày | 2 lần/ngày | 2 lần/ngày, kèm **báo cáo sức khỏe tháng** |
| Dưỡng sinh buổi sáng | Có | Có | Có |
| Vật lý trị liệu (30 phút/buổi) | — (mua lẻ được) | 2 buổi/tuần | Hằng ngày |
| Thể dục trên ghế (20 phút) | 2 buổi/tuần | 3 buổi/tuần | Hằng ngày |
| Ghế massage (15–20 phút/lượt) | 1 lượt/tuần | 3 lượt/tuần | Hằng ngày |
| Ngâm chân thảo dược (20 phút) | — | 2 lượt/tuần | Hằng ngày |
| Đo đường huyết hằng ngày | — | Có | Có |
| Theo dõi cân nặng | Hằng tháng | 2 tuần/lần | Hằng tuần |
| Thư giãn tự do (TV, nhạc, báo, cờ) | Có | Có | Có |
| Số dịch vụ tự chọn được tích | Tối đa 4 | Tối đa 7 | Không giới hạn |
| Care log trên app | Theo từng mục | Theo từng mục | Theo từng mục |
| Ảnh trên app | 3 ảnh/ngày | Tối đa 5 ảnh/ngày | Không giới hạn |
| Cảnh báo sức khỏe AI tới gia đình | — | Có | Có |
| Nhắn tin với staff | Trong giờ hành chính | Trong ca | Trong ca, **được ưu tiên phản hồi** |
| Ưu tiên giữ chỗ khi trung tâm đầy | — | — | Có |
| Giá tham khảo (gói ngày) | 350k | 420k | 520k |

> Các con số trên chỉ để làm mẫu dữ liệu. Manager được sửa toàn bộ, vì tạo gói và đặt giá là quyền của Manager.

### 4.2 Danh mục dịch vụ (Manager tự thêm, sửa, xóa)

Đối tượng là người cao tuổi, nên danh mục chỉ gồm những hoạt động **nhẹ nhàng, an toàn**. Danh mục dưới đây đã đối chiếu với BV Phục hồi chức năng TP.HCM (bán trú), Thiên Đức, Phú Nghĩa, Diên Hồng, Nhân Ái DayCare và mô hình adult day care của Mỹ. Bộ lõi các nơi đều có: đo chỉ số, dưỡng sinh, vật lý trị liệu, massage.

⚠ = nhóm `MEDICAL` phải được **điều dưỡng cho phép** mới dùng.

**A. Có sẵn trong mọi gói** (không tích, ai cũng được)

| Hoạt động | Thời lượng | Ghi chú |
|---|---|---|
| Đo chỉ số (huyết áp, mạch, nhiệt độ) | Theo hạng: 1–2 lần/ngày | Điều dưỡng làm |
| Dưỡng sinh, thở, khởi động khớp buổi sáng | 20–30 phút/ngày | Cả nhóm, ngồi hoặc đứng tùy sức |
| Thư giãn tự do | Cả ngày | TV, nhạc xưa, báo, cờ, trà |
| Sinh nhật tháng, lễ Tết | Theo lịch | — |

**B. Tự chọn trong gói** (gia đình tích có hoặc không; số mục được tích: Cơ bản tối đa 4, Tiêu chuẩn tối đa 7, Cao cấp không giới hạn)

| Nhóm | Hoạt động | Thời lượng | Cơ bản | Tiêu chuẩn | Cao cấp | Người phụ trách | Lưu ý sức khỏe |
|---|---|---|---|---|---|---|---|
| Vận động, phục hồi | Vật lý trị liệu bằng máy (xe đạp tập, thanh song song, ròng rọc) | 30 phút | — | 2 buổi/tuần | Hằng ngày | Điều dưỡng | Đo huyết áp trước khi tập |
| | Thể dục trên ghế | 20 phút | 2 buổi/tuần | 3 buổi/tuần | Hằng ngày | Hộ lý | Hợp cụ đi lại khó, ngồi xe lăn |
| | Đi bộ có người dìu ở sân vườn | 15 phút | Có | Có | Có | Hộ lý | Phòng té ngã |
| Thư giãn | Ghế massage | 15–20 phút | 1 lượt/tuần | 3 lượt/tuần | Hằng ngày | Hộ lý trông | ⚠ Không dùng khi huyết áp cao, mới tai biến, loãng xương nặng |
| | Ngâm chân thảo dược | 20 phút | — | 2 lượt/tuần | Hằng ngày | Hộ lý | ⚠ Tiểu đường: nước tối đa 40°C, kiểm tra vết thương ở chân |
| Trí nhớ, nhận thức | Trò chơi trí nhớ: lật thẻ, ô chữ, đố vui | 30 phút | Có | Có | Có | Hộ lý | Hợp cụ sa sút trí tuệ nhẹ |
| | Hồi tưởng: xem ảnh xưa, kể chuyện, nghe nhạc thời trẻ | 30 phút | — | Có | Có | Hộ lý | Gia đình gửi ảnh cũ qua app |
| Tinh thần | Âm nhạc: nghe, hát cùng nhau | 30 phút | Có | Có | Có | Hộ lý | — |
| | Sinh hoạt tâm linh (tụng kinh, đọc kinh) | 30 phút | Có | Có | Có | Tự sinh hoạt | Tùy tôn giáo |
| | Thủ công nhẹ: tô màu, đan len, xếp giấy | 30 phút | Có | Có | Có | Hộ lý | Không dùng kéo nhọn |
| Sức khỏe | Nhắc và ghi nhận uống thuốc | — | Có | Có | Có | Điều dưỡng | Gia đình gửi thuốc kèm hướng dẫn |
| | Đo đường huyết hằng ngày | 5 phút | — | Có | Có | Điều dưỡng | Cho cụ tiểu đường |
| | Theo dõi cân nặng | — | Hằng tháng | 2 tuần/lần | Hằng tuần | Điều dưỡng | — |

**C. Mua thêm** (tính tiền riêng)

| Dịch vụ | Đơn vị | Lưu ý |
|---|---|---|
| Thêm buổi vật lý trị liệu | Gói 4 buổi | — |
| Phục hồi chức năng 1-1 sau tai biến | Buổi 45 phút | Điều dưỡng hướng dẫn |
| Cắt tóc, gội đầu | Lần | — |
| Cắt móng tay chân | Lần | ⚠ Cụ tiểu đường do điều dưỡng làm |
| Sữa dinh dưỡng, suất ăn thêm | Theo tháng | — |
| Ở lại muộn đến 18h | Lần hoặc tháng | Mục 4.3 |
| Đi cùng cụ tới phòng khám | Lần | — |

**D. Không đưa vào** (dù có nơi đang làm)

| Hoạt động | Lý do |
|---|---|
| Xông hơi, onsen, tắm nóng | Dễ tụt hoặc tăng huyết áp, choáng; hợp nội trú có y tế 24/7 hơn bán trú |
| Cứu ngải, chiếu đèn nhiệt | Nguy cơ bỏng, nhất là cụ tiểu đường giảm cảm giác ở da |
| Bấm huyệt, tập nói và tập nuốt | Cần kỹ thuật viên chuyên môn; trung tâm chỉ có điều dưỡng và hộ lý |
| Làm vườn, nấu ăn, gói bánh | Có dao, lửa, phải cúi lâu |
| Khiêu vũ, zumba | Nguy cơ té ngã |
| Dã ngoại, đi chùa bên ngoài | Rủi ro di chuyển; để phiên bản sau |

**Manager quản lý dịch vụ (thêm, sửa, xóa)** với các trường: tên, nhóm, mô tả, ảnh, thời lượng mỗi lượt, thiết bị cần dùng (liên kết bảng `equipment`), người phụ trách (điều dưỡng / hộ lý), có cần điều dưỡng cho phép với nhóm `MEDICAL` không, giá khi mua lẻ, trạng thái (đang bán / tạm ngừng). Danh mục trên là khung ban đầu; trung tâm muốn thêm dịch vụ thì Manager tự thêm.

**Manager tạo gói** bằng cách chọn dịch vụ đưa vào gói. Với mỗi dịch vụ, Manager đặt:
- **Loại:** có sẵn / tự chọn trong gói / mua thêm.
- **Số lượt** mỗi tuần (ví dụ vật lý trị liệu 2 buổi/tuần).
- **Áp dụng cho:** thời hạn nào, đối tượng nào.
- **Giá** nếu là mua thêm.

### 4.3 Gói ở lại muộn

Dành cho gia đình đi làm về trễ, đăng ký **thêm** bên cạnh gói chính.

| Loại | Cách tính | Ghi chú |
|---|---|---|
| Theo lần | Theo giờ, đặt trước trong ngày | Ví dụ 16h30–18h |
| Theo tháng | Cố định các ngày trong tuần | Giá theo tháng rẻ hơn so với mua từng lần |

- Giờ ở lại muộn kéo dài **tối đa tới giờ đóng cửa của trung tâm**, cấu hình trong `center_settings.closing_time`. Đề xuất đóng cửa lúc 18h **[HỎI]**.
- Trong giờ ở lại muộn, cụ được ăn nhẹ và tham gia hoạt động nhẹ. Staff trực muộn được xếp theo số cụ đã đăng ký.

### 4.4 Công thức giá

```
Giá kỳ = Giá gốc (hạng × thời hạn) × (1 + phụ phí mức độ) − giảm giá thời hạn + dịch vụ lẻ + gói ở lại muộn
```

Một **đăng ký (subscription)** luôn gắn với một cụ, một gói (hạng + thời hạn), một đối tượng, các dịch vụ đã tích chọn, ngày bắt đầu và ngày kết thúc. **Nâng hạng** có hiệu lực ngay và chỉ trả phần chênh lệch cho số ngày còn lại. **Hạ hạng** có hiệu lực từ kỳ sau.

### 4.5 Cơ sở vật chất

Phạm vi đã chốt: **quản lý phòng, giường và sức chứa, kèm kiểm kê thiết bị**. Số lượng do **Manager nhập tay**. Hệ thống **tự cập nhật, so sánh và báo** khi thiếu hoặc hư hỏng. Không làm lịch bảo trì định kỳ.

**Các khu của trung tâm**

| Khu | Dùng để làm gì | Gắn với hạng gói |
|---|---|---|
| Sảnh đón trả, quầy tiếp nhận | Check-in/out, xác nhận người đón, tiếp khách tham quan | Mọi hạng |
| Phòng y tế | Đo chỉ số, sơ cứu, nơi cụ mệt nằm theo dõi | Mọi hạng |
| Phòng sinh hoạt chung | Thư giãn tự do: xem TV, nghe nhạc, đọc báo, đánh cờ | Mọi hạng |
| Phòng vật lý trị liệu | Tập phục hồi | Tiêu chuẩn: 2 buổi/tuần; Cao cấp: hằng ngày |
| Phòng ăn | Bữa sáng, trưa, xế | Bữa theo hạng |
| Phòng nghỉ trưa | Nghỉ trưa | Cơ bản: phòng chung; Tiêu chuẩn: phòng 4–6 người; Cao cấp: phòng 2 người, giường cố định |
| Khu ghế massage | Ghế massage toàn thân | Theo số lượt của hạng |
| Khu có kiểm soát ra vào | Chống đi lạc | Chỉ cần nếu trung tâm nhận cụ sa sút trí tuệ **[HỎI]** |
| Sân vườn, lối đi bộ | Tắm nắng, đi bộ, dưỡng sinh | Mọi hạng |

**Manager nhập tay**
- **Phòng:** tên, loại khu, sức chứa, hạng được dùng, trạng thái (hoạt động / tạm đóng).
- **Giường nghỉ trưa:** thuộc phòng nào, dành cho hạng nào.
- **Thiết bị:** tên, nhóm (y tế / tập VLTL / sinh hoạt / an toàn), phòng đặt, **tổng số lượng**, **định mức tối thiểu** cần có. Ví dụ: máy đo huyết áp, máy SpO₂, máy đo đường huyết, bình oxy, xe lăn, xe đạp tập, thanh song song, máy tập ròng rọc, ghế massage, bồn ngâm chân.

**Hệ thống tự làm**
- Tính **số lượng dùng được** = tổng − đang hỏng − đang sửa.
- So sánh với nhu cầu, rồi **cảnh báo Manager** khi:
  - giường nghỉ trưa của một hạng không đủ cho số cụ đăng ký đi ngày đó;
  - thiết bị dùng được thấp hơn định mức tối thiểu;
  - lịch hoạt động xếp vượt sức chứa phòng, hoặc xếp vào phòng đang tạm đóng.
- **Chặn bán gói** khi hạng đó đã hết chỗ. Cụ hạng Cao cấp được ưu tiên giữ chỗ.
- Tự gán **giường cố định** cho cụ Cao cấp. Các hạng khác được xếp giường theo từng ngày.
- Đưa số liệu thiếu, hỏng, tỷ lệ sử dụng phòng và giường vào **báo cáo gửi Admin**.

### 4.6 Màn hình Manager nhập cơ sở vật chất

Trên web, Manager có menu **"Cơ sở vật chất"** gồm 5 màn hình:

| Màn hình | Manager nhập / làm gì |
|---|---|
| **Khu và phòng** | Thêm, sửa phòng: tên, loại khu (y tế / sinh hoạt chung / VLTL / ăn / nghỉ trưa / kiểm soát ra vào / ghế massage / sân vườn / sảnh), tầng hoặc vị trí, diện tích, sức chứa, hạng được dùng, trạng thái (hoạt động / tạm đóng), ảnh và mô tả cho trang giới thiệu |
| **Giường nghỉ trưa** | Thêm giường theo phòng: mã giường, hạng, trạng thái. Xem sơ đồ giường: trống / gán cố định / xếp theo ngày |
| **Thiết bị** | Thêm thiết bị: tên, nhóm (y tế / tập VLTL / sinh hoạt / an toàn), phòng đặt, tổng số lượng, định mức tối thiểu, **số chỗ phục vụ cùng lúc** (dùng để xếp khung giờ VLTL), ghi chú. Nhập lô hàng loạt bằng file Excel **[ĐỀ XUẤT]** |
| **Báo hỏng** | Danh sách báo hỏng từ staff. Đổi trạng thái: đang sửa / đã sửa xong / thanh lý |
| **Kiểm kê** | Tạo phiếu kiểm kê, nhập số đếm thực tế, xem chênh lệch, ghi lý do, chốt phiếu |

Trang tổng quan của menu này hiện: số chỗ còn trống theo hạng hôm nay, thiết bị dưới định mức, phòng đang tạm đóng, báo hỏng chưa xử lý.

### 4.7 Sức chứa, giữ chỗ và danh sách chờ
- **Chỗ chia cứng theo hạng**, tính bằng số giường nghỉ trưa của hạng đó.
- **Cao cấp được ưu tiên:** không đẩy cụ hạng thấp ra ngoài. Cao cấp chỉ được xếp **đầu danh sách chờ**.
- **Danh sách chờ:** khi hạng đã đầy, Family đăng ký vào danh sách chờ. Thứ tự là hạng cao trước, sau đó ai đăng ký trước. Khi có chỗ trống, hệ thống báo người đầu danh sách và **giữ chỗ 24 giờ** để họ thanh toán. Quá 24 giờ thì chuyển sang người kế tiếp.
- **Nâng hạng** khi hạng cao đã hết giường: vào danh sách chờ, giữ nguyên hạng cũ cho tới khi có chỗ.
- **Giường cố định của Cao cấp** được giữ trống cả khi cụ báo nghỉ.
- **Gói ngày hạng Cao cấp** được bán nếu hôm đó còn giường Cao cấp trống. Cụ được xếp giường theo ngày; hết giường thì không bán.
- Nếu trung tâm nhận cụ sa sút trí tuệ **[HỎI]**: khu có kiểm soát ra vào có sức chứa riêng, đầy thì chỉ cho vào danh sách chờ.

### 4.8 Bù quyền lợi khi cơ sở vật chất gặp sự cố

| Tình huống | Xử lý |
|---|---|
| Phòng Cao cấp tạm đóng, còn phòng tương đương | Chuyển tạm sang phòng tương đương, không cần bù |
| Phòng Cao cấp tạm đóng, **không còn** phòng tương đương | Xếp tạm phòng 4–6 người, **bù 1 buổi dịch vụ lẻ** cho mỗi ngày bị ảnh hưởng |
| Phòng hoặc máy VLTL hỏng, cụ mất buổi tập | **Bù buổi vào tuần sau**. Hệ thống tự báo gia đình |
| Phòng ăn hoặc bếp có sự cố | Đặt suất ăn bên ngoài thay thế. Ghi lại để đưa vào báo cáo |

Mọi trường hợp bù đều được ghi vào bảng `entitlement_compensations` và gửi thông báo cho gia đình.

### 4.9 Xếp lịch VLTL và ghế massage (do Manager và staff xếp)
- Gia đình chỉ tích có dùng dịch vụ hay không (4.12). **Giờ cụ thể do Manager và staff xếp**, gia đình không chọn khung giờ.
- Hệ thống chia khung giờ, mỗi khung 30 phút. Số cụ tối đa trong một khung bằng số chỗ phục vụ cùng lúc của thiết bị trong phòng. Ví dụ phòng có 3 xe đạp tập thì mỗi khung tối đa 3 cụ; có 4 ghế massage thì mỗi khung tối đa 4 cụ.
- Hệ thống gợi ý xếp khung theo số lượt của từng cụ. Manager và staff được sửa. Trong ngày, khung nào kín thì staff cho cụ làm việc khác trước rồi quay lại.
- Thiết bị hỏng làm giảm chỗ trong khung: hệ thống báo các cụ bị ảnh hưởng và đưa vào diện bù buổi (4.8).
- Gia đình xem được trên app: **phòng và giường** cụ được xếp, **lịch VLTL và massage** đã xếp.

### 4.10 Đồ cá nhân và bồi thường
- **Đồ cá nhân gửi lại** (xe lăn riêng, máy trợ thính, thuốc mang theo, quần áo thay): staff ghi nhận khi nhận và khi trả, có ảnh. Gia đình xem danh sách trên app.
- **Hư hỏng đồ của trung tâm:** hao mòn bình thường thì trung tâm chịu. Nếu hỏng do cố ý, hoặc do đồ cá nhân của cụ gây ra, staff lập biên bản kèm ảnh, Manager quyết định có tính **phí phát sinh** vào hóa đơn kỳ sau hay không **[ĐỀ XUẤT]**.

### 4.11 Trang giới thiệu cơ sở vật chất
- Manager cập nhật ảnh và mô tả từng khu ngay trong màn hình "Khu và phòng" (4.6).
- Trang gói dịch vụ ghi rõ **hạng nào dùng khu nào** để khách so sánh trước khi đăng ký.

### 4.12 Màn hình đăng ký gói (Family, có trên web và app)

**Các bước**
1. Chọn cụ.
2. Chọn **thời hạn** (Trục 1).
3. Chọn **đối tượng** (Trục 3). Cụ đã được đánh giá thì ô này điền sẵn và khóa.
4. Chọn **hạng**, rồi **tích chọn dịch vụ** (Trục 2).
5. Xem tóm tắt và giá, rồi gửi đăng ký. Sau đó theo luồng 5.1: đánh giá đầu vào → Manager duyệt → thanh toán.

**Cách hiển thị dịch vụ ở bước 4**

| Loại | Gia đình thấy gì | Gia đình làm được gì |
|---|---|---|
| Có sẵn | Danh sách kèm dấu tích xanh | Chỉ xem |
| Tự chọn trong gói | Ô tích, có ghi "Đã chọn x/y" | **Tích có hoặc không** dùng dịch vụ đó, không vượt quá giới hạn của hạng (4 / 7 / không giới hạn). Bỏ tích không làm giảm giá |
| Mua thêm | Ô tích, kèm giá | Tích thì cộng tiền vào tổng |
| Có ở hạng cao hơn | Mờ, có biểu tượng khóa | Chỉ xem, có gợi ý nâng hạng |

- Gia đình **chỉ chọn có dùng dịch vụ hay không**, **không chọn khung giờ**. Giờ cụ thể do Manager và staff xếp sau.
- Trong ngày, nếu một dịch vụ đang kín chỗ (ví dụ cả 4 ghế massage đều có người), staff cho cụ **làm hoạt động khác trước**, xong thì quay lại. Không dùng danh sách chờ cho dịch vụ.
- Gia đình **đổi lựa chọn** trên app được, có hiệu lực **từ tuần sau**.
- Nếu tích **hồi tưởng**, gia đình được **gửi ảnh cũ** của cụ qua app để staff dùng trong buổi kể chuyện.
- **Khách chưa đăng nhập** chỉ xem được **thẻ tóm tắt** của mỗi hạng (tên hạng, giá "từ … đ/ngày", 3–4 quyền lợi chính). Phải đăng nhập mới xem danh sách chi tiết và tích chọn.

**Hệ thống lọc theo lựa chọn ở bước 2 và 3 [ĐỀ XUẤT]**

| Lựa chọn trước đó | Ảnh hưởng tới bước 4 |
|---|---|
| Đối tượng `MEDICAL` | Ẩn hạng Cơ bản. Ghế massage, ngâm chân thảo dược ghi chú "cần điều dưỡng cho phép" |
| Đối tượng `ACTIVE` | Hiện đủ 3 hạng và đủ dịch vụ |
| Gói ngày | Chỉ hiện dịch vụ có trong ngày đã đặt. Không bán mua thêm theo tháng (ví dụ ở lại muộn theo tháng) |
| Tháng 3 buổi/tuần | Số lượt dịch vụ tính theo các ngày cụ đi |
| Gói tháng, quý, năm | Hiện đầy đủ |

**Khi điều dưỡng đánh giá khác với gia đình khai [ĐỀ XUẤT]:** hệ thống tính lại giá; nếu đang chọn hạng Cơ bản mà cụ thuộc nhóm `MEDICAL` thì buộc nâng lên Tiêu chuẩn; tự bỏ dịch vụ không phù hợp; gửi lại cho gia đình **xác nhận** trước khi thanh toán. Nếu cụ đang đi và được đánh giá lại thì thay đổi có hiệu lực **từ kỳ sau**.

## 5. Các luồng nghiệp vụ chính

### 5.1 Đăng ký và đánh giá đầu vào
1. Khách xem gói trên web hoặc hỏi chatbot, rồi tạo tài khoản Family.
2. Family thêm hồ sơ cụ: thông tin, bệnh nền, dị ứng, thuốc đang dùng, sở thích. Family **tự khai** mức độ ban đầu và chọn gói mong muốn.
3. Hệ thống đặt **lịch đánh giá đầu vào**. Cụ đến trung tâm, điều dưỡng chấm thang ADL và ghi chỉ số nền.
4. Manager duyệt **đối tượng** và gói. Nếu đối tượng thật khác với Family khai thì áp dụng quy tắc ở cuối mục 4.12.
5. Family thanh toán qua cổng. Khi nhận callback thành công thì subscription chuyển `ACTIVE`.
6. Manager phân công staff phụ trách cụ. Cụ bắt đầu đi từ ngày hiệu lực.

### 5.2 Một ngày bán trú
1. **Check-in:** staff quét mã của cụ hoặc chọn trên app. Gia đình nhận thông báo "đã đến".
2. **Đo chỉ số sáng** (điều dưỡng): huyết áp, mạch, nhiệt độ, SpO₂, đường huyết nếu cần. AI kiểm tra bất thường.
3. Hoạt động, bữa ăn, nghỉ trưa, vật lý trị liệu theo lịch của gói. Hộ lý ghi care log và chụp ảnh.
4. **Check-out:** staff chọn người đón trong danh sách **người được phép đón**, đối chiếu ảnh và CCCD. Nếu không có trong danh sách thì không giao cụ, gọi Family chính xác nhận và ghi lại. Gia đình nhận thông báo "đã về" cùng tóm tắt trong ngày.
5. Đến 16h30 mà chưa có người đón:
   - Cụ có **gói ở lại muộn** (4.3) thì ở lại theo gói, nhưng phải được đón **trước giờ đóng cửa**.
   - Cụ không có gói thì hệ thống tự nhắc Family, staff ghi nhận **đón trễ**, có phụ thu theo giờ **[ĐỀ XUẤT]**.
   - Trước giờ đóng cửa 30 phút mà vẫn chưa có người đón: nhắc lần nữa và gọi người liên hệ chính.

### 5.3 Báo nghỉ
- Family báo nghỉ trên app, chọn ngày và lý do.
- Gói `DAY`: báo trước hạn (BR-21) thì không mất tiền ngày đó.
- Gói tháng, quý, năm: **vẫn tính tiền**. Báo nghỉ chỉ để trung tâm chuẩn bị nhân sự và suất ăn.

### 5.4 Xếp ca staff
1. Staff đăng ký **lịch rảnh** theo tuần trên app.
2. Manager bấm "Gợi ý xếp ca". AI dùng lịch rảnh, chức vụ, số cụ dự kiến (trừ cụ đã báo nghỉ) và tỷ lệ staff theo hạng gói để đề xuất lịch.
3. Manager sửa nếu cần rồi duyệt. Staff nhận lịch trên app.
4. **Xin nghỉ hoặc đổi ca** (tùy chọn): staff gửi yêu cầu, Manager duyệt. Có thể chọn người thay trong số staff đang rảnh.

### 5.5 Thực đơn
AI gợi ý thực đơn tuần theo bệnh nền của các cụ đang đi (ví dụ tiểu đường thì ít đường, cao huyết áp thì ít muối) và theo hạng gói. Manager duyệt. Cụ có thực đơn riêng (hạng Cao cấp) thì có món thay thế.

### 5.6 Cảnh báo sức khỏe và chuyển viện
1. Chỉ số vượt ngưỡng, hoặc AI phát hiện xu hướng xấu nhiều ngày liền, thì hệ thống tạo **cảnh báo**.
2. Cảnh báo gửi tới điều dưỡng trực và Manager. Family nhận cảnh báo nếu gói có quyền lợi này. Riêng mức khẩn cấp thì Family **luôn nhận**.
3. Điều dưỡng xử lý và ghi kết quả. Nếu cần thì đề xuất **chuyển viện**: ghi bệnh viện, giờ chuyển, người đi kèm, gọi Family.
4. Nếu cụ nhập viện nhiều ngày, Family gửi giấy nhập viện để xin **bảo lưu** (5.8).

### 5.7 Thanh toán, gia hạn, hết hạn
- Thanh toán khi đăng ký, gia hạn, nâng hạng, mua dịch vụ lẻ. Mỗi lần thanh toán sinh **hóa đơn**.
- **Trước 7 ngày** hết hạn: nhắc gia hạn.
- Hết hạn mà chưa đóng: subscription chuyển `SUSPENDED`, cụ không check-in được.

### 5.8 Bảo lưu khi nhập viện
Family gửi giấy nhập viện, Manager duyệt. Subscription chuyển `PAUSED`, các ngày còn lại được dời sang sau, **tối đa 30 ngày**. Quá 30 ngày thì phải gia hạn bảo lưu hoặc chấm dứt.

### 5.9 Qua đời hoặc chấm dứt
- **Qua đời:** Family báo kèm giấy chứng tử (hoặc giấy tờ tương đương). Manager duyệt. Subscription chuyển `TERMINATED`. **Hoàn phần chưa dùng của gói dài hạn** qua cổng thanh toán. Phí đặt cọc và dịch vụ lẻ đã dùng không hoàn.
- **Gia đình tự ý dừng gói** khi chưa hết hạn: **không hoàn tiền** (BR-20).

### 5.10 Báo hỏng và kiểm kê cơ sở vật chất

**Báo hỏng**
1. Staff thấy thiết bị hỏng hoặc phòng có sự cố thì báo trên app: chọn thiết bị hoặc phòng, nhập số lượng hỏng, mô tả, chụp ảnh.
2. Hệ thống trừ ngay khỏi số lượng dùng được. Nếu xuống dưới định mức thì cảnh báo Manager.
3. Manager chọn cách xử lý: **đang sửa**, **đã sửa xong** (cộng lại số dùng được), hoặc **thanh lý** (Manager giảm tổng số bằng tay).
4. Phòng có sự cố thì Manager chuyển sang **tạm đóng**. Hệ thống báo các lịch hoạt động và giường bị ảnh hưởng để Manager chuyển sang phòng khác.

**Kiểm kê định kỳ** (Manager tự chọn tuần hoặc tháng)
1. Manager đếm thực tế rồi nhập số lượng vào phiếu kiểm kê.
2. Hệ thống so với số trên hệ thống, hiện **chênh lệch** (thiếu hoặc dư) theo từng thiết bị.
3. Manager ghi lý do chênh lệch, chốt phiếu. Số liệu được cập nhật và đưa vào báo cáo gửi Admin.

## 6. Business rules

| Mã | Quy tắc |
|---|---|
| BR-01 | Hệ thống phục vụ một trung tâm duy nhất |
| BR-02 | Một tài khoản Family quản lý được nhiều cụ. Mỗi cụ có một **người liên hệ chính** |
| BR-03 | Mỗi cụ chỉ có **một subscription chính đang hiệu lực** tại một thời điểm, cộng thêm các dịch vụ lẻ |
| BR-04 | Tính năng trên app của Family được bật hoặc tắt theo quyền lợi của gói đang hiệu lực (mục 4.1) |
| BR-10 | Chỉ điều dưỡng được đánh giá đầu vào. Chỉ Manager được chốt đối tượng của cụ |
| BR-11 | Đối tượng `MEDICAL` không mua được hạng Cơ bản; dùng ghế massage phải được điều dưỡng cho phép |
| BR-13 | Gia đình chỉ tích chọn dịch vụ có trong gói, không vượt quá số dịch vụ tự chọn của hạng. Đổi lựa chọn có hiệu lực từ tuần sau |
| BR-14 | Khách chưa đăng nhập chỉ xem thẻ tóm tắt của từng hạng |
| BR-15 | Dịch vụ có dấu ⚠ (ghế massage, ngâm chân, cắt móng cho cụ tiểu đường) chỉ dùng được cho nhóm `MEDICAL` khi điều dưỡng đã cho phép |
| BR-12 | Đánh giá lại mức độ định kỳ mỗi 3 tháng, hoặc khi sức khỏe thay đổi. Mức đổi thì giá đổi từ kỳ sau |
| BR-20 | Đã thanh toán thì **không hoàn tiền** khi cụ nghỉ hoặc gia đình dừng gói, trừ trường hợp qua đời (5.9) |
| BR-21 | Gói `DAY`: báo nghỉ trước **17h ngày hôm trước** thì không mất tiền ngày đó **[HỎI]** |
| BR-22 | Nhập viện có giấy tờ thì được bảo lưu tối đa 30 ngày |
| BR-23 | Nhắc gia hạn trước 7 ngày. Hết hạn chưa đóng thì `SUSPENDED` |
| BR-24 | Thanh toán chỉ qua cổng thanh toán, không thu tiền mặt **[HỎI]** |
| BR-30 | Chỉ giao cụ cho người có trong danh sách người được phép đón. Mọi lần đón đều được ghi lại |
| BR-31 | Không check-in được nếu subscription không `ACTIVE`, hoặc nếu hôm đó không thuộc lịch của gói (ví dụ gói M3 đi vào thứ Ba) |
| BR-34 | Giờ chăm sóc chung của mọi hạng là 7h–16h30. Ở lại sau 16h30 cần gói ở lại muộn, và không được quá giờ đóng cửa của trung tâm |
| BR-32 | Chỉ điều dưỡng được ghi chỉ số sức khỏe. Hộ lý ghi ăn uống, vệ sinh, hoạt động, ảnh |
| BR-33 | Staff chỉ thấy các cụ được phân công trong ca của mình |
| BR-40 | Staff chỉ nhắn tin được với Family của các cụ mình phụ trách. Toàn bộ tin nhắn được lưu. Manager **[ĐỀ XUẤT]** chỉ mở lịch sử tin nhắn khi có khiếu nại hoặc khi Family yêu cầu, và việc mở được ghi vào audit log |
| BR-50 | AI chỉ gợi ý. Lịch ca và thực đơn phải được Manager duyệt mới có hiệu lực |
| BR-51 | Dữ liệu gửi sang AI phải ẩn thông tin cá nhân (tên, CCCD, số điện thoại) |
| BR-70 | Tổng số lượng phòng, giường, thiết bị chỉ do Manager nhập hoặc sửa. Hệ thống chỉ thay đổi **số dùng được** qua báo hỏng, sửa xong và kiểm kê |
| BR-71 | Không bán gói và không xếp cụ vượt sức chứa của hạng đó. Cụ sa sút trí tuệ (nếu nhận) chỉ được xếp vào khu có kiểm soát ra vào |
| BR-72 | Thiết bị dùng được thấp hơn định mức tối thiểu thì cảnh báo Manager và ghi vào báo cáo |
| BR-73 | Phòng tạm đóng thì không xếp lịch hay giường vào. Cụ Cao cấp bị ảnh hưởng được chuyển tạm sang phòng tương đương |
| BR-74 | Chỗ chia cứng theo hạng, bằng số giường nghỉ trưa của hạng đó. Không đẩy cụ hạng thấp ra ngoài để nhường chỗ cho hạng cao |
| BR-75 | Danh sách chờ xếp theo hạng cao trước, sau đó ai đăng ký trước. Giữ chỗ 24 giờ để thanh toán |
| BR-76 | Giường cố định của cụ Cao cấp được giữ trống cả khi cụ báo nghỉ |
| BR-77 | Quyền lợi bị mất do cơ sở vật chất gặp sự cố phải được bù theo bảng ở mục 4.8 và báo cho gia đình |
| BR-78 | Số cụ tối đa trong một khung VLTL không vượt quá số chỗ phục vụ cùng lúc của thiết bị đang dùng được |
| BR-60 | Admin chỉ xem số liệu tổng hợp, không xem hồ sơ sức khỏe từng cụ **[HỎI]** |

## 7. Ma trận phân quyền

✔ toàn quyền · 👁 chỉ xem · ◐ trong phạm vi được giao hoặc của mình · — không có quyền

| Chức năng | Admin | Manager | Điều dưỡng | Hộ lý | Family |
|---|---|---|---|---|---|
| Dashboard doanh thu, báo cáo tổng hợp | ✔ | ✔ | — | — | — |
| Tài khoản Manager, cấu hình hệ thống | ✔ | — | — | — | — |
| Tài khoản staff, hồ sơ staff | 👁 | ✔ | ◐ | ◐ | — |
| Gói, giá, dịch vụ lẻ | 👁 | ✔ | — | — | 👁 |
| Hồ sơ cụ | — | ✔ | ◐ | ◐ | ◐ |
| Đánh giá đầu vào | — | duyệt | ✔ | — | 👁 kết quả |
| Subscription, thanh toán, hóa đơn | 👁 tổng | ✔ | — | — | ◐ |
| Check-in/out, xác nhận người đón | — | 👁 | ✔ | ✔ | 👁 |
| Chỉ số sức khỏe | — | 👁 | ◐ | 👁 | 👁 (theo gói) |
| Care log, ảnh | — | 👁 | ◐ | ◐ | 👁 (theo gói) |
| Cảnh báo, chuyển viện | — | ✔ | ◐ | — | 👁 |
| Báo nghỉ | — | duyệt | — | — | ✔ |
| Bảo lưu, chấm dứt hợp đồng | — | duyệt | — | — | gửi yêu cầu |
| Lịch rảnh, xin nghỉ, đổi ca | — | duyệt | ◐ | ◐ | — |
| Xếp ca (AI gợi ý) | — | ✔ | 👁 lịch mình | 👁 lịch mình | — |
| Thực đơn (AI gợi ý) | — | ✔ | 👁 | 👁 | 👁 |
| Lịch hoạt động | — | ✔ | 👁 | 👁 | 👁 |
| Nhắn tin | — | BR-40 | ◐ | ◐ | ◐ |
| Chatbot | — | — | — | — | ✔ (cả khách vãng lai) |
| Phòng, giường, thiết bị, kiểm kê | 👁 báo cáo | ✔ | báo hỏng | báo hỏng | 👁 trang giới thiệu |
| Danh sách chờ | — | ✔ | — | — | ◐ |
| Khung giờ VLTL, xếp giường | — | ✔ | 👁 | 👁 | 👁 của cụ mình |
| Đồ cá nhân gửi lại | — | 👁 | ✔ | ✔ | 👁 |
| Audit log | ✔ | — | — | — | — |

## 8. Thay đổi dữ liệu so với ERD cũ (21 bảng)

**Bỏ hoặc gộp**
- `centers` (nhiều trung tâm) → gộp vào `center_settings` dạng 1 dòng, chứa giờ mở cửa, chính sách, FAQ cho chatbot.
- `messages.channel` = `CENTER_ADMIN` → bỏ.

**Giữ, có sửa**
- `service_packages`: thêm `tier`, `billing_cycle` (DAY/M3/MONTH/Q/Y), `weekdays`, `base_price`, `allowed_target_groups`.
- `registrations` → đổi tên thành `subscriptions`: thêm `target_group` (ACTIVE/MEDICAL), `status` (PENDING_ASSESSMENT / AWAITING_PAYMENT / ACTIVE / PAUSED / SUSPENDED / TERMINATED / EXPIRED), `paused_until`.
- `attendance`: thêm `checked_in_by`, `checked_out_by`, `pickup_person_id`.
- `care_logs`: tách phần chỉ số sức khỏe ra bảng riêng.
- `shifts`: thêm `note` (text, thay cho chức vụ trưởng ca).
- `absence_requests`: giữ lại.
- `refunds`: chỉ dùng cho trường hợp qua đời.

**Thêm mới**

| Bảng | Mục đích |
|---|---|
| `staff_profiles` | Chức vụ (NURSE/CAREGIVER), chứng chỉ, ngày vào làm |
| `package_entitlements` | Quyền lợi của từng gói (khóa, giá trị), ví dụ `photo_per_day=5`, `ai_alert_family=true` |
| `target_group_surcharges` | Phụ phí theo đối tượng (vận động được / cần hỗ trợ về bệnh) |
| `services` | Danh mục dịch vụ do Manager quản lý: nhóm, mô tả, ảnh, thời lượng, thiết bị cần dùng, cần điều dưỡng cho phép không, giá mua lẻ, trạng thái |
| `package_services` | Gói gồm dịch vụ nào: loại (có sẵn / tự chọn / mua thêm), số lượt mỗi tuần, áp dụng cho thời hạn và đối tượng nào, giá |
| `subscription_service_choices` | Dịch vụ gia đình đã tích chọn, ngày hiệu lực |
| `service_permissions` | Điều dưỡng cho phép hoặc không cho phép cụ dùng dịch vụ có dấu ⚠, kèm lý do và ngày đánh giá lại |
| `reminiscence_photos` | Ảnh cũ gia đình gửi cho buổi hồi tưởng |
| `subscription_add_ons` | Dịch vụ lẻ đã mua (dịch vụ lấy từ bảng `services`) |
| `late_stay_bookings` | Gói ở lại muộn (theo lần hoặc theo tháng): ngày, giờ kết thúc, không quá `closing_time`. Ghi cả đón trễ khi không có gói |
| `assessments` | Đánh giá đầu vào và đánh giá định kỳ (điểm ADL, ghi chú, người đánh giá, người duyệt) |
| `authorized_pickups` | Người được phép đón (tên, quan hệ, SĐT, CCCD, ảnh) |
| `health_metrics` | Huyết áp, mạch, nhiệt độ, SpO₂, đường huyết, cân nặng, thời điểm đo, người đo |
| `health_alerts` | Cảnh báo (nguồn: ngưỡng hoặc AI, mức độ, trạng thái, người xử lý) |
| `hospital_transfers` | Chuyển viện |
| `staff_availability` | Lịch rảnh |
| `leave_requests` | Xin nghỉ, đổi ca |
| `subscription_pauses` | Bảo lưu (giấy tờ, từ ngày, đến ngày, người duyệt) |
| `rooms` | Phòng: loại khu, sức chứa, hạng được dùng, trạng thái |
| `nap_beds`, `nap_bed_assignments` | Giường nghỉ trưa; gán cố định (Cao cấp) hoặc theo ngày |
| `equipment` | Thiết bị: nhóm, phòng, tổng số lượng, định mức tối thiểu, số đang hỏng, số đang sửa |
| `damage_reports` | Báo hỏng: thiết bị hoặc phòng, số lượng, ảnh, người báo, trạng thái xử lý |
| `inventory_checks`, `inventory_check_items` | Phiếu kiểm kê: số trên hệ thống, số đếm thực tế, chênh lệch, lý do |
| `room_photos` | Ảnh từng khu cho trang giới thiệu |
| `waitlist_entries` | Danh sách chờ: cụ, hạng mong muốn, thời điểm đăng ký, hạn giữ chỗ, trạng thái |
| `therapy_slots`, `therapy_bookings` | Khung giờ VLTL và ghế massage, cụ được xếp, trạng thái (đã tập / vắng / cần bù) |
| `entitlement_compensations` | Ghi nhận bù quyền lợi: lý do, hình thức bù, ngày, cụ |
| `personal_belongings` | Đồ cá nhân gửi lại: mô tả, ảnh, người nhận, thời điểm nhận và trả |
| `manager_reports` | Báo cáo Manager gửi Admin |

## 9. Câu hỏi còn mở

1. **Admin có xem hồ sơ sức khỏe chi tiết không?** Lần trước bạn giữ nguyên dòng đề xuất nhưng chưa trả lời. Mình đang tạm để là không (BR-60).
2. **Manager xem tin nhắn:** bạn trả lời "tùy vào lịch sử tin nhắn". Mình đề xuất Manager chỉ mở khi có khiếu nại hoặc Family yêu cầu, và việc mở được ghi log (BR-40). Bạn đồng ý không?
3. **Hạn báo nghỉ cho gói ngày:** 17h hôm trước có hợp lý không? Tiền ngày đó hoàn lại qua cổng thanh toán, hay giữ thành **số dư** để trừ vào lần đặt sau? Mình đề xuất giữ thành số dư vì đơn giản hơn.
4. **Đặt cọc:** có thu cọc như Hạnh Phúc Viên (bằng 1 tháng phí) không, hay chỉ trả trước là đủ?
5. **Ngày lễ, Tết:** trung tâm nghỉ hay mở cửa có phụ thu? Gói tháng có trừ ngày lễ không?
6. **Tiền mặt:** có cho Manager ghi nhận thanh toán tiền mặt tại quầy cho gia đình không dùng app không? Người già và một số gia đình có thể không quen thanh toán online.
7. Không có kỹ thuật viên: vật lý trị liệu và phục hồi chức năng 1-1 do **điều dưỡng** hướng dẫn, đúng không?
8. **Cụ không có smartphone:** Family là người dùng app. Còn cụ có cần thẻ hoặc mã QR để check-in không? Mình đề xuất in **thẻ QR** cho mỗi cụ.
9. **Báo cáo Manager gửi Admin:** tự động theo tuần hoặc tháng (doanh thu, số cụ, sự cố), hay Manager tự soạn rồi gửi?
10. **Giờ đóng cửa** của trung tâm là mấy giờ (giới hạn cho gói ở lại muộn)? Không có gói mà đón trễ thì phụ thu bao nhiêu mỗi giờ?
11. **Chatbot** trả lời dựa trên FAQ và thông tin gói mà Manager nhập, đúng không? Khi chatbot không trả lời được thì chuyển cho ai: Manager hay một staff trực?
12. **Đối tượng `MEDICAL`:** phụ phí +30% và chỉ mua từ hạng Tiêu chuẩn trở lên, được không?
13. **Sa sút trí tuệ:** trung tâm có nhận không? Nếu nhận thì cần khu có kiểm soát ra vào. **Nằm liệt giường hoàn toàn:** đề xuất không nhận, vì bán trú phải đưa đón cụ hằng ngày.
14. **Giá gói tháng** cố định một mức, bất kể tháng đó có 24 hay 27 ngày đi được, đúng không?
