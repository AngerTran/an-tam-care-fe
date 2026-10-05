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

Kết luận: giá bán trú trên thị trường khoảng **350–600k/ngày**. Các nơi đều chia gói theo **ba trục**: thời hạn, hạng dịch vụ, mức độ chăm sóc. Dịch vụ lẻ tính riêng.

## 3. Actor và nhiệm vụ

| Actor | Kênh | Nhiệm vụ chính | Không được làm |
|---|---|---|---|
| **Platform Administrator** (chủ doanh nghiệp, nhà đầu tư) | Web | Xem dashboard doanh thu, số cụ, tỷ lệ lấp chỗ, báo cáo Manager gửi. Quản lý tài khoản Manager. Cấu hình hệ thống: cổng thanh toán, AI, bảo mật. Xem nhật ký hệ thống | **[ĐỀ XUẤT]** Không xem hồ sơ sức khỏe chi tiết của từng cụ, chỉ xem số liệu tổng hợp. Không tham gia vận hành hằng ngày |
| **Center Manager** | Web | Tạo gói và đặt giá. Duyệt đăng ký và mức độ chăm sóc. Quản lý cụ, gia đình, staff. Xếp ca (duyệt gợi ý của AI). Thực đơn (duyệt gợi ý của AI). Lịch hoạt động. Duyệt xin nghỉ, bảo lưu, chấm dứt hợp đồng. Xử lý cảnh báo và chuyển viện. Lập báo cáo gửi Admin | Không nhắn tin trực tiếp thay staff. Chỉ xem tin nhắn theo quy tắc ở BR-40 |
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

**Trục 1: Thời hạn và tần suất**

| Mã | Tên | Cách tính | Báo nghỉ |
|---|---|---|---|
| `DAY` | Gói ngày | Đặt trước từng ngày, trả trước | **Không mất tiền** nếu báo nghỉ đúng hạn (BR-21) |
| `M3` | Tháng 3 buổi/tuần | 12–13 buổi/tháng, cố định T2-4-6 hoặc T3-5-7 | Vẫn tính tiền |
| `M6` | Tháng 6 buổi/tuần | 26 buổi/tháng, nghỉ Chủ nhật | Vẫn tính tiền |
| `Q` / `Y` | Quý / Năm | Như M6, giảm giá 5% / 10% **[ĐỀ XUẤT]** | Vẫn tính tiền |

`DAY` phù hợp cho người đi ngắn hạn hoặc **đi thử**. `M3` dành cho cụ mới làm quen. `M6`, `Q`, `Y` là gói dài hạn.

**Trục 2: Hạng dịch vụ**

| Quyền lợi | Cơ bản | Tiêu chuẩn | Cao cấp |
|---|---|---|---|
| Giờ chăm sóc | 7h–16h30 | 7h–16h30 | 7h–16h30 |
| Bữa ăn | Trưa + xế | Sáng + trưa + xế | Sáng + trưa + xế, **thực đơn riêng theo bệnh lý** |
| Chỗ nghỉ trưa | Phòng chung | Phòng 4–6 người | **Phòng 2 người, giường riêng cố định** |
| Số cụ trên mỗi staff | 1:8 | 1:6 | 1:4 |
| Đo chỉ số sức khỏe | 1 lần/ngày | 2 lần/ngày | 2 lần/ngày, kèm **báo cáo sức khỏe tháng** |
| Vật lý trị liệu | — | 2 buổi/tuần | Hằng ngày |
| Hoạt động nhóm | Có | Có | Có, kèm hoạt động 1-1 |
| Care log trên app | Theo từng mục | Theo từng mục | Theo từng mục |
| Ảnh trên app | 3 ảnh/ngày | Tối đa 5 ảnh/ngày | Không giới hạn |
| Cảnh báo sức khỏe AI tới gia đình | — | Có | Có |
| Nhắn tin với staff | Trong giờ hành chính | Trong ca | Trong ca, **được ưu tiên phản hồi** |
| Ưu tiên giữ chỗ khi trung tâm đầy | — | — | Có |
| Giá tham khảo (gói ngày) | 350k | 420k | 520k |

> Các con số trên chỉ để làm mẫu dữ liệu. Manager được sửa toàn bộ, vì tạo gói và đặt giá là quyền của Manager.

**Trục 3: Mức độ chăm sóc (do điều dưỡng đánh giá, Manager duyệt)**

| Mức | Mô tả | Phụ phí **[ĐỀ XUẤT]** | Ràng buộc |
|---|---|---|---|
| `INDEPENDENT` — Tự lập | Tự ăn, tự đi, tự vệ sinh | +0% | — |
| `PARTIAL` — Cần hỗ trợ một phần | Cần dìu đi, hỗ trợ tắm hoặc vệ sinh | +15% | — |
| `FULL` — Phụ thuộc hoàn toàn | Ngồi xe lăn hoặc nằm, cần hỗ trợ mọi sinh hoạt | +30% | Chỉ mua được từ hạng Tiêu chuẩn trở lên |
| `DEMENTIA` — Sa sút trí tuệ | Dễ đi lạc, rối loạn hành vi | +35% | Chỉ mua được từ hạng Tiêu chuẩn trở lên; sinh hoạt ở khu có kiểm soát ra vào |

Có thể dùng thang **Barthel (ADL)** để chấm điểm, giúp phân loại khách quan: 0–20 phụ thuộc hoàn toàn, 21–60 cần hỗ trợ nhiều, 61–90 cần hỗ trợ một phần, 91–100 tự lập. Sa sút trí tuệ đánh giá riêng, cộng thêm vào mức chính.

### 4.2 Dịch vụ lẻ (add-on, mua thêm theo lần hoặc theo tháng)

Vật lý trị liệu thêm buổi, massage, cắt tóc, gội đầu, suất ăn thêm, đo đường huyết, đi cùng cụ tới phòng khám.

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

Một **đăng ký (subscription)** luôn gắn với một cụ, một gói (hạng + thời hạn), một mức độ chăm sóc, ngày bắt đầu và ngày kết thúc. **Nâng hạng** có hiệu lực ngay và chỉ trả phần chênh lệch cho số ngày còn lại. **Hạ hạng** có hiệu lực từ kỳ sau.

### 4.5 Cơ sở vật chất

Phạm vi đã chốt: **quản lý phòng, giường và sức chứa, kèm kiểm kê thiết bị**. Số lượng do **Manager nhập tay**. Hệ thống **tự cập nhật, so sánh và báo** khi thiếu hoặc hư hỏng. Không làm lịch bảo trì định kỳ.

**Các khu của trung tâm**

| Khu | Dùng để làm gì | Gắn với hạng gói |
|---|---|---|
| Sảnh đón trả, quầy tiếp nhận | Check-in/out, xác nhận người đón, tiếp khách tham quan | Mọi hạng |
| Phòng y tế | Đo chỉ số, sơ cứu, nơi cụ mệt nằm theo dõi | Mọi hạng |
| Phòng sinh hoạt chung | Hoạt động nhóm, văn nghệ, đọc sách | Mọi hạng |
| Phòng vật lý trị liệu | Tập phục hồi | Tiêu chuẩn: 2 buổi/tuần; Cao cấp: hằng ngày |
| Phòng ăn | Bữa sáng, trưa, xế | Bữa theo hạng |
| Phòng nghỉ trưa | Nghỉ trưa | Cơ bản: phòng chung; Tiêu chuẩn: phòng 4–6 người; Cao cấp: phòng 2 người, giường cố định |
| Khu có kiểm soát ra vào | Chống đi lạc | Bắt buộc cho mức `DEMENTIA` |
| Phòng hoạt động 1-1 | Trò chuyện, trị liệu nhận thức | Cao cấp |
| Sân vườn, lối đi bộ | Tắm nắng, đi bộ, dưỡng sinh | Mọi hạng |

**Manager nhập tay**
- **Phòng:** tên, loại khu, sức chứa, hạng được dùng, trạng thái (hoạt động / tạm đóng).
- **Giường nghỉ trưa:** thuộc phòng nào, dành cho hạng nào.
- **Thiết bị:** tên, nhóm (y tế / tập VLTL / sinh hoạt / an toàn), phòng đặt, **tổng số lượng**, **định mức tối thiểu** cần có. Ví dụ: máy đo huyết áp, máy SpO₂, máy đo đường huyết, bình oxy, xe lăn, xe đạp tập, thanh song song.

**Hệ thống tự làm**
- Tính **số lượng dùng được** = tổng − đang hỏng − đang sửa.
- So sánh với nhu cầu, rồi **cảnh báo Manager** khi:
  - giường nghỉ trưa của một hạng không đủ cho số cụ đăng ký đi ngày đó;
  - thiết bị dùng được thấp hơn định mức tối thiểu;
  - lịch hoạt động xếp vượt sức chứa phòng, hoặc xếp vào phòng đang tạm đóng.
- **Chặn bán gói** khi hạng đó đã hết chỗ. Cụ hạng Cao cấp được ưu tiên giữ chỗ.
- Tự gán **giường cố định** cho cụ Cao cấp. Các hạng khác được xếp giường theo từng ngày.
- Đưa số liệu thiếu, hỏng, tỷ lệ sử dụng phòng và giường vào **báo cáo gửi Admin**.

## 5. Các luồng nghiệp vụ chính

### 5.1 Đăng ký và đánh giá đầu vào
1. Khách xem gói trên web hoặc hỏi chatbot, rồi tạo tài khoản Family.
2. Family thêm hồ sơ cụ: thông tin, bệnh nền, dị ứng, thuốc đang dùng, sở thích. Family **tự khai** mức độ ban đầu và chọn gói mong muốn.
3. Hệ thống đặt **lịch đánh giá đầu vào**. Cụ đến trung tâm, điều dưỡng chấm thang ADL và ghi chỉ số nền.
4. Manager duyệt **mức độ chăm sóc** và gói. Nếu mức thật khác mức Family khai thì hệ thống tính lại giá và báo cho Family.
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
| BR-10 | Chỉ điều dưỡng được đánh giá đầu vào. Chỉ Manager được chốt mức độ chăm sóc |
| BR-11 | Mức `FULL` và `DEMENTIA` không mua được hạng Cơ bản |
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
| BR-71 | Không bán gói và không xếp cụ vượt sức chứa của hạng đó. Cụ mức `DEMENTIA` chỉ được xếp vào khu có kiểm soát ra vào |
| BR-72 | Thiết bị dùng được thấp hơn định mức tối thiểu thì cảnh báo Manager và ghi vào báo cáo |
| BR-73 | Phòng tạm đóng thì không xếp lịch hay giường vào. Cụ Cao cấp bị ảnh hưởng được chuyển tạm sang phòng tương đương **[ĐỀ XUẤT]** |
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
| Audit log | ✔ | — | — | — | — |

## 8. Thay đổi dữ liệu so với ERD cũ (21 bảng)

**Bỏ hoặc gộp**
- `centers` (nhiều trung tâm) → gộp vào `center_settings` dạng 1 dòng, chứa giờ mở cửa, chính sách, FAQ cho chatbot.
- `messages.channel` = `CENTER_ADMIN` → bỏ.

**Giữ, có sửa**
- `service_packages`: thêm `tier`, `billing_cycle` (DAY/M3/M6/Q/Y), `weekdays`, `base_price`, `allowed_care_levels`.
- `registrations` → đổi tên thành `subscriptions`: thêm `care_level`, `status` (PENDING_ASSESSMENT / AWAITING_PAYMENT / ACTIVE / PAUSED / SUSPENDED / TERMINATED / EXPIRED), `paused_until`.
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
| `care_level_surcharges` | Phụ phí theo mức độ chăm sóc |
| `add_on_services`, `subscription_add_ons` | Dịch vụ lẻ |
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
| `manager_reports` | Báo cáo Manager gửi Admin |

## 9. Câu hỏi còn mở

1. **Admin có xem hồ sơ sức khỏe chi tiết không?** Lần trước bạn giữ nguyên dòng đề xuất nhưng chưa trả lời. Mình đang tạm để là không (BR-60).
2. **Manager xem tin nhắn:** bạn trả lời "tùy vào lịch sử tin nhắn". Mình đề xuất Manager chỉ mở khi có khiếu nại hoặc Family yêu cầu, và việc mở được ghi log (BR-40). Bạn đồng ý không?
3. **Hạn báo nghỉ cho gói ngày:** 17h hôm trước có hợp lý không? Tiền ngày đó hoàn lại qua cổng thanh toán, hay giữ thành **số dư** để trừ vào lần đặt sau? Mình đề xuất giữ thành số dư vì đơn giản hơn.
4. **Đặt cọc:** có thu cọc như Hạnh Phúc Viên (bằng 1 tháng phí) không, hay chỉ trả trước là đủ?
5. **Ngày lễ, Tết:** trung tâm nghỉ hay mở cửa có phụ thu? Gói tháng có trừ ngày lễ không?
6. **Tiền mặt:** có cho Manager ghi nhận thanh toán tiền mặt tại quầy cho gia đình không dùng app không? Người già và một số gia đình có thể không quen thanh toán online.
7. **Ba hạng và các con số ở mục 4.1** (giờ, bữa, tỷ lệ staff, số ảnh, giá) có ổn để làm dữ liệu mẫu không? Cần thêm hay bớt quyền lợi nào?
8. **Cụ không có smartphone:** Family là người dùng app. Còn cụ có cần thẻ hoặc mã QR để check-in không? Mình đề xuất in **thẻ QR** cho mỗi cụ.
9. **Báo cáo Manager gửi Admin:** tự động theo tuần hoặc tháng (doanh thu, số cụ, sự cố), hay Manager tự soạn rồi gửi?
10. **Giờ đóng cửa** của trung tâm là mấy giờ (giới hạn cho gói ở lại muộn)? Không có gói mà đón trễ thì phụ thu bao nhiêu mỗi giờ?
11. **Chatbot** trả lời dựa trên FAQ và thông tin gói mà Manager nhập, đúng không? Khi chatbot không trả lời được thì chuyển cho ai: Manager hay một staff trực?
