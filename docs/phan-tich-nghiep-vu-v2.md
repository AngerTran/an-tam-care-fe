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
| `MONTH` | Gói tháng | **Đi cả tháng, trừ Chủ nhật** (thứ 2 đến thứ 7). Giá cố định một mức, không phụ thuộc tháng có bao nhiêu ngày | Vẫn tính tiền |
| `Q` / `Y` | Quý / Năm | Như gói tháng, giảm giá 5% / 10% **[ĐỀ XUẤT]** | Vẫn tính tiền |

`DAY` phù hợp cho người đi ngắn hạn hoặc **đi thử**. `M3` dành cho cụ mới làm quen. `MONTH`, `Q`, `Y` là gói dài hạn.

**Trục 3: Đối tượng và mức độ chăm sóc (gia đình tự khai, điều dưỡng đánh giá, Manager duyệt)**

Cách chia theo tình trạng sức khỏe giống các viện đang hoạt động (Damoca, Bình Mỹ, Diên Hồng).

| Mã | Đối tượng | Dành cho ai | Phụ phí | Hạng tối thiểu |
|---|---|---|---|---|
| `MOBILE` | Người già vận động được | Tự đi lại, tự ăn, tự vệ sinh, hoặc chỉ cần nhắc nhở; không có bệnh cần theo dõi đặc biệt | Không có | Cơ bản |
| `CHRONIC` | Cần hỗ trợ về bệnh mãn tính | Tiểu đường, cao huyết áp, tim mạch; cần theo dõi chỉ số và thuốc | **Thỏa thuận với gia đình** | Tiêu chuẩn |
| `REHAB` | Tập phục hồi chức năng | Yếu cơ, thoái hóa khớp, sau gãy xương hoặc phẫu thuật, đi lại khó cần tập lại | **Thỏa thuận với gia đình** | Tiêu chuẩn |
| `DEMENTIA` | Sa sút trí tuệ **mức nhẹ đến vừa** | Giảm trí nhớ, dễ đi lạc; còn đi lại được, không kích động nặng | **Thỏa thuận với gia đình** | Tiêu chuẩn |
| `STROKE` | Sau tai biến, đột quỵ | Đã qua giai đoạn cấp ở bệnh viện; còn yếu liệt một bên, nói hoặc nuốt khó | **Thỏa thuận với gia đình** | Tiêu chuẩn |

**Không nhận:** cụ nằm liệt giường hoàn toàn, sa sút trí tuệ nặng (kích động mạnh, không kiểm soát được), cụ cần chăm sóc tích cực (ăn qua sonde, mở khí quản, vết loét nặng, giai đoạn cuối). Những trường hợp này cần y tế 24/7, không hợp mô hình bán trú.

**Chăm sóc riêng của từng nhóm** (có sẵn, không tính vào số hoạt động tự chọn)

| | `CHRONIC` | `REHAB` | `DEMENTIA` | `STROKE` |
|---|---|---|---|---|
| Chăm sóc riêng | Đo chỉ số và đường huyết theo bệnh; nhắc thuốc đúng giờ; thực đơn ít đường, ít muối | VLTL tăng cường: Tiêu chuẩn 3 buổi/tuần, Cao cấp hằng ngày. Bài tập về nhà gửi gia đình qua app | Sinh hoạt ở **khu có kiểm soát ra vào**; **thẻ hoặc vòng tay nhận diện** chống đi lạc; âm nhạc, đọc báo kể chuyện nhóm **hằng ngày** | VLTL phục hồi (tập đi, tập tay) **hằng ngày**; đo huyết áp **3 lần/ngày**; thức ăn mềm, có người hỗ trợ khi ăn để phòng sặc |
| Theo dõi | Xu hướng chỉ số; AI cảnh báo khi vượt ngưỡng | Đánh giá tiến triển hằng tháng (chấm lại Barthel, khả năng đi lại) | Ghi **hành vi** vào care log: lo âu, kích động, đi lang thang | **Dấu hiệu tái phát** (méo miệng, yếu tay, nói khó): cảnh báo khẩn cấp, gọi gia đình, chuyển viện |
| Báo cáo cho gia đình | Biểu đồ chỉ số hằng tháng | Báo cáo tiến triển hằng tháng | Báo cáo hành vi và sinh hoạt hằng tuần | Báo cáo huyết áp và tiến triển hằng tháng |
| Hạn chế | Ngâm chân ⚠ nếu tiểu đường | Massage, ngâm chân ⚠ | Không dùng vật sắc nhọn; check-out kiểm tra kỹ người đón | Ghế massage ⚠ chỉ khi đã qua giai đoạn cấp; ngâm chân ⚠ vì giảm cảm giác bên liệt |
| Người phụ trách | Điều dưỡng | Điều dưỡng hướng dẫn VLTL | Điều dưỡng, hộ lý | Điều dưỡng hướng dẫn VLTL |

**Quy tắc xếp nhóm**
- Một cụ chỉ thuộc **một nhóm chính**. Có nhiều bệnh thì xếp theo nhóm có mức chăm sóc cao nhất (ví dụ sau tai biến kèm tiểu đường thì xếp `STROKE`). Bệnh còn lại vẫn ghi vào hồ sơ để theo dõi.
- Điều dưỡng xếp nhóm khi đánh giá đầu vào, dựa trên **điểm Barthel cộng chẩn đoán** (giấy ra viện, giấy khám sức khỏe). Manager duyệt.
- Cụ đã từng được đánh giá thì ô đối tượng được **điền sẵn và khóa**, gia đình không tự đổi.
- Đánh giá lại **mỗi tháng** với `REHAB` và `STROKE` (tình trạng thay đổi nhanh), **3 tháng một lần** với các nhóm còn lại.

**Phụ phí thỏa thuận**
- Mỗi nhóm có phụ phí, nhưng mức cụ thể **do Manager thỏa thuận với gia đình** sau buổi đánh giá, tùy tình trạng của cụ.
- Khi duyệt đăng ký, Manager nhập mức phụ phí (số tiền theo kỳ), kèm ghi chú lý do. Gia đình thấy giá cuối cùng và **xác nhận trên app** trước khi thanh toán.
- Trên web và ở bước chọn gói, giá hiển thị là **giá gói chưa gồm phụ phí**, kèm dòng "Phụ phí theo tình trạng sức khỏe, báo sau buổi đánh giá".
- Không thu **đặt cọc**: gia đình trả trước toàn bộ qua cổng thanh toán.

**Trục 2: Hạng dịch vụ (bảng chốt)**

| Mục | Cơ bản | Tiêu chuẩn | Cao cấp |
|---|---|---|---|
| **Giá tham khảo** | 350.000đ/ngày | 420.000đ/ngày | 520.000đ/ngày |
| **Đối tượng được mua** | Chỉ nhóm vận động được | Cả 5 nhóm | Cả 5 nhóm |
| **Giờ chăm sóc** | 7h–16h30 | 7h–16h30 | 7h–16h30 |
| **Số cụ trên mỗi staff** | 1:8 | 1:6 | 1:4 |
| **1. Ăn uống** | | | |
| Bữa trong ngày | Trưa + xế | Sáng + trưa + xế | Sáng + trưa + xế |
| Thực đơn | Chung | Chung, có món thay khi kiêng | **Riêng theo bệnh lý** |
| **2. Nghỉ trưa** | | | |
| Phòng | Phòng chung | Phòng 4–6 người | Phòng 2 người |
| Giường | Xếp theo ngày | Xếp theo ngày | **Giường cố định** |
| **3. Sức khỏe (có sẵn)** | | | |
| Đo huyết áp, mạch, nhiệt độ | 1 lần/ngày | 2 lần/ngày | 2 lần/ngày + **báo cáo sức khỏe tháng** |
| Nhắc và ghi nhận uống thuốc | Có | Có | Có |
| Đo đường huyết (cụ tiểu đường) | Mua thêm | Hằng ngày | Hằng ngày |
| Theo dõi cân nặng | Hằng tháng | 2 tuần/lần | Hằng tuần |
| **4. Hoạt động có sẵn** | | | |
| Dưỡng sinh, thở, khởi động khớp buổi sáng | Hằng ngày | Hằng ngày | Hằng ngày |
| Thư giãn tự do (TV, nhạc xưa, báo, cờ, trà) | Có | Có | Có |
| Sinh nhật tháng, lễ Tết | Có | Có | Có |
| **5. Hoạt động tự chọn** (gia đình tích) | **Tối đa 5 trong 8** | **Tối đa 7 trong 10** | **Cả 10** |
| Vật lý trị liệu bằng máy (30 phút) | — | 2 buổi/tuần | Hằng ngày |
| Ghế massage (20 phút) ⚠ | 1 lượt/tuần | 3 lượt/tuần | Hằng ngày |
| Máy massage chân (15 phút) ⚠ | 1 lượt/tuần | 3 lượt/tuần | Hằng ngày |
| Ngâm chân thảo dược (20 phút) ⚠ | — | 2 lượt/tuần | Hằng ngày |
| Thể dục trên ghế (20 phút) | 2 buổi/tuần | 3 buổi/tuần | Hằng ngày |
| Đi bộ có người dìu ở sân vườn (15 phút) | Hằng ngày | Hằng ngày | Hằng ngày |
| Âm nhạc, hát nhẹ (30 phút) | Theo lịch | Theo lịch | Theo lịch |
| Đọc báo, kể chuyện nhóm (30 phút) | Theo lịch | Theo lịch | Theo lịch |
| Cắm hoa đơn giản (30 phút) | Theo lịch | Theo lịch | Theo lịch |
| Cờ tướng, cờ caro (30 phút) | Theo lịch | Theo lịch | Theo lịch |
| **6. Kết nối gia đình** | | | |
| Care log trên app | Theo từng mục | Theo từng mục | Theo từng mục |
| Ảnh trên app | 3 ảnh/ngày | Tối đa 5 ảnh/ngày | Không giới hạn |
| Cảnh báo sức khỏe AI tới gia đình | Chỉ khi khẩn cấp | Có | Có |
| Nhắn tin với staff | Trong giờ hành chính | Trong ca | Trong ca, **ưu tiên phản hồi** |
| **7. Ưu tiên** | | | |
| Giữ chỗ khi trung tâm đầy | — | — | Đầu danh sách chờ |

⚠ = các nhóm bệnh (`CHRONIC`, `REHAB`, `DEMENTIA`, `STROKE`) phải được điều dưỡng cho phép. Dịch vụ mua thêm (mục 4.2C) áp dụng như nhau cho cả ba hạng.

> Các con số trên chỉ để làm mẫu dữ liệu. Manager được sửa toàn bộ, vì tạo gói và đặt giá là quyền của Manager.

### 4.2 Danh mục dịch vụ (Manager tự thêm, sửa, xóa)

Đối tượng là người cao tuổi, nên danh mục chỉ gồm những hoạt động **nhẹ nhàng, an toàn**. Danh mục dưới đây đã đối chiếu với BV Phục hồi chức năng TP.HCM (bán trú), Thiên Đức, Phú Nghĩa, Diên Hồng, Nhân Ái DayCare và mô hình adult day care của Mỹ. Bộ lõi các nơi đều có: đo chỉ số, dưỡng sinh, vật lý trị liệu, massage.

⚠ = các nhóm bệnh phải được **điều dưỡng cho phép** mới dùng.

**A. Có sẵn trong mọi gói** (không tích, ai cũng được)

| Hoạt động | Thời lượng | Ghi chú |
|---|---|---|
| Đo chỉ số (huyết áp, mạch, nhiệt độ) | Theo hạng: 1–2 lần/ngày | Điều dưỡng làm |
| Dưỡng sinh, thở, khởi động khớp buổi sáng | 20–30 phút/ngày | Cả nhóm, ngồi hoặc đứng tùy sức |
| Thư giãn tự do | Cả ngày | TV, nhạc xưa, báo, cờ, trà |
| Sinh nhật tháng, lễ Tết | Theo lịch | — |
| Nhắc và ghi nhận uống thuốc | Theo giờ uống | Điều dưỡng làm; gia đình gửi thuốc kèm hướng dẫn |
| Theo dõi cân nặng | Theo hạng | Điều dưỡng làm |
| Đo đường huyết hằng ngày (cụ tiểu đường) | 5 phút | Có sẵn ở Tiêu chuẩn, Cao cấp; hạng Cơ bản mua thêm |

**B. Tự chọn trong gói: danh sách cứng 10 hoạt động** (chỉ gồm hoạt động thực tế, không có tâm linh. Cơ bản có 8 hoạt động, tích tối đa 5. Tiêu chuẩn có 10, tích tối đa 7. Cao cấp dùng cả 10)

| # | Hoạt động | Cụ thể làm gì | Thời lượng | Nơi, thiết bị | Người phụ trách | Lưu ý sức khỏe |
|---|---|---|---|---|---|---|
| 1 | Vật lý trị liệu bằng máy | Xe đạp tập, thanh song song tập đi, ròng rọc tập tay vai | 30 phút | Phòng VLTL | Điều dưỡng hướng dẫn | Đo huyết áp trước khi tập |
| 2 | Ghế massage | Massage lưng, vai, chân bằng ghế, chế độ nhẹ | 15–20 phút | Khu ghế massage | Hộ lý trông | ⚠ Không dùng khi huyết áp cao, mới tai biến, loãng xương nặng |
| 3 | Máy massage chân | Đặt chân vào máy, massage bàn chân và bắp chân | 15 phút | Khu ghế massage | Hộ lý trông | ⚠ Nhẹ hơn ghế massage, hợp cụ hay tê chân |
| 4 | Ngâm chân thảo dược | Nước ấm với gừng, ngải, sả | 20 phút | Bồn ngâm chân | Hộ lý | ⚠ Nước tối đa 40°C; cụ tiểu đường kiểm tra vết thương ở chân |
| 5 | Thể dục trên ghế | Nâng tay, duỗi chân, xoay khớp theo nhạc | 20 phút | Phòng sinh hoạt chung | Hộ lý | Hợp cả cụ ngồi xe lăn |
| 6 | Đi bộ có người dìu | Đi chậm quanh sân có tay vịn | 15 phút | Sân vườn | Hộ lý | Giày chống trơn, phòng té ngã |
| 7 | Âm nhạc, hát nhẹ | Nghe nhạc xưa, hát nhẹ nhàng cùng nhau, vỗ tay theo nhịp. Không hát karaoke | 30 phút | Phòng sinh hoạt chung | Hộ lý | Âm lượng vừa phải |
| 8 | Đọc báo, kể chuyện nhóm | Staff đọc to tin tức nhẹ nhàng, cả nhóm trò chuyện | 30 phút | Phòng sinh hoạt chung | Hộ lý | Tránh tin tiêu cực |
| 9 | Cắm hoa đơn giản | Cắm hoa đã cắt sẵn cành vào bình | 30 phút | Phòng sinh hoạt chung | Hộ lý | Không dùng kéo |
| 10 | Cờ tướng, cờ caro | Chơi theo cặp, staff ghép cặp | 30 phút | Phòng sinh hoạt chung | Hộ lý | — |

**C. Mua thêm** (tính tiền riêng)

| Dịch vụ | Đơn vị | Lưu ý |
|---|---|---|
| Thêm buổi vật lý trị liệu | Gói 4 buổi | — |
| Đo đường huyết hằng ngày | Theo tháng | Chỉ hạng Cơ bản; Tiêu chuẩn và Cao cấp đã có sẵn |
| Phục hồi chức năng 1-1 sau tai biến | Buổi 45 phút | Điều dưỡng hướng dẫn |
| Cắt tóc, gội đầu | Lần | — |
| Cắt móng tay chân | Lần | ⚠ Cụ tiểu đường do điều dưỡng làm |
| Sữa dinh dưỡng, suất ăn thêm | Theo tháng | — |
| Đi cùng cụ tới phòng khám | Lần | — |

**D. Không đưa vào** (dù có nơi đang làm)

| Hoạt động | Lý do |
|---|---|
| Xông hơi, onsen, tắm nóng | Dễ tụt hoặc tăng huyết áp, choáng; hợp nội trú có y tế 24/7 hơn bán trú |
| Cứu ngải, chiếu đèn nhiệt | Nguy cơ bỏng, nhất là cụ tiểu đường giảm cảm giác ở da |
| Tâm linh, trò chơi trí nhớ, hồi tưởng, thủ công, chăm cây | Nhóm chọn danh sách cứng 10 hoạt động thực tế ở mục B |
| Bấm huyệt, tập nói và tập nuốt | Cần kỹ thuật viên chuyên môn; trung tâm chỉ có điều dưỡng và hộ lý (vật lý trị liệu do điều dưỡng hướng dẫn) |
| Làm vườn, nấu ăn, gói bánh | Có dao, lửa, phải cúi lâu |
| Khiêu vũ, zumba | Nguy cơ té ngã |
| Dã ngoại, đi chùa bên ngoài | Rủi ro di chuyển; để phiên bản sau |

**E. Lịch một ngày mẫu**

Vật lý trị liệu, ghế massage và ngâm chân được **xoay vòng theo lượt** trong hai khung sáng và chiều. Cụ chưa tới lượt thì tham gia hoạt động nhóm của khung đó.

| Giờ | Hoạt động | Hạng |
|---|---|---|
| 7h00–7h45 | Đón cụ, check-in; ăn sáng | Ăn sáng: Tiêu chuẩn, Cao cấp |
| 7h45–8h15 | Đo chỉ số sáng, nhắc uống thuốc, đo đường huyết | Tất cả |
| 8h15–8h45 | Dưỡng sinh, thở, khởi động khớp | Tất cả |
| 8h45–10h30 | **Khung sáng:** vật lý trị liệu, ghế massage, máy massage chân, thể dục trên ghế theo lượt. Hoạt động nhóm: đọc báo, kể chuyện (T2, T4, T6), cắm hoa (T3, T5, T7) | Theo hoạt động đã tích |
| 10h30–11h00 | Đi bộ có người dìu ở sân vườn, uống nước | Theo dịch vụ đã tích |
| 11h00–12h00 | Ăn trưa | Tất cả |
| 12h00–13h30 | Nghỉ trưa | Tất cả |
| 13h30–14h00 | Đo chỉ số chiều | Tiêu chuẩn, Cao cấp |
| 14h00–15h00 | **Khung chiều:** ngâm chân, ghế massage, máy massage chân, vật lý trị liệu theo lượt. Hoạt động nhóm: âm nhạc, hát nhẹ (hằng ngày), cờ tướng, cờ caro (hằng ngày) | Theo hoạt động đã tích |
| 15h00–15h30 | Ăn xế | Tất cả |
| 15h30–16h30 | Thư giãn tự do, staff chốt care log, trả cụ và xác nhận người đón | Tất cả |
| 16h30–19h30 | Chờ gia đình đón: không hoạt động, không ăn uống; một staff trực | Cụ chưa được đón |

**Manager quản lý dịch vụ (thêm, sửa, xóa)** với các trường: tên, nhóm, mô tả, ảnh, thời lượng mỗi lượt, thiết bị cần dùng (liên kết bảng `equipment`), người phụ trách (điều dưỡng / hộ lý), có cần điều dưỡng cho phép với nhóm nhóm bệnh không, giá khi mua lẻ, trạng thái (đang bán / tạm ngừng). Danh mục trên là khung ban đầu; trung tâm muốn thêm dịch vụ thì Manager tự thêm.

**Manager tạo gói** bằng cách chọn dịch vụ đưa vào gói. Với mỗi dịch vụ, Manager đặt:
- **Loại:** có sẵn / tự chọn trong gói / mua thêm.
- **Số lượt** mỗi tuần (ví dụ vật lý trị liệu 2 buổi/tuần).
- **Áp dụng cho:** thời hạn nào, đối tượng nào.
- **Giá** nếu là mua thêm.

### 4.3 Giờ đón cụ và chờ đón muộn

Trung tâm chỉ làm **bán trú**. **Không có gói ở lại muộn.**

- **7h–16h30** là giờ chăm sóc. Sau 16h30 trung tâm **không có hoạt động và không có ăn uống**.
- **16h30–19h30** chỉ là thời gian **chờ gia đình đón**, **miễn phí**. Cụ ngồi chờ ở sảnh, có một staff **trực chờ đón**.
- **19h30** là giờ đóng cửa, cũng là giờ đón muộn nhất. Manager chỉnh được giờ này trong cài đặt (`center_settings.closing_time`).
- Hệ thống tự nhắc gia đình: 16h30 báo "cụ đã sẵn sàng về", 17h00 nhắc lần 1, 18h30 nhắc lần 2 và gọi người liên hệ chính.
- Quá 19h30 chưa có người đón: staff gọi tất cả người được phép đón, ghi **sự cố đón trễ**, báo Manager, và ở lại tới khi giao được cụ.

### 4.4 Công thức giá

```
Giá kỳ = Giá gốc (hạng × thời hạn) − giảm giá thời hạn + phụ phí thỏa thuận theo nhóm + dịch vụ lẻ
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
| Khu có kiểm soát ra vào | Chống đi lạc | Bắt buộc cho nhóm `DEMENTIA` |
| Sân vườn, lối đi bộ | Tắm nắng, đi bộ, dưỡng sinh | Mọi hạng |

**Manager nhập tay**
- **Phòng:** tên, loại khu, sức chứa, hạng được dùng, trạng thái (hoạt động / tạm đóng).
- **Giường nghỉ trưa:** thuộc phòng nào, dành cho hạng nào.
- **Thiết bị:** tên, nhóm (y tế / tập VLTL / sinh hoạt / an toàn), phòng đặt, **tổng số lượng**, **định mức tối thiểu** cần có. Ví dụ: máy đo huyết áp, máy SpO₂, máy đo đường huyết, bình oxy, xe lăn, xe đạp tập, thanh song song, máy tập ròng rọc, ghế massage, máy massage chân, bồn ngâm chân, bàn cờ.

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
- Khu có kiểm soát ra vào cho nhóm `DEMENTIA` có sức chứa riêng; đầy thì chỉ cho vào danh sách chờ.

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
| Tự chọn trong gói | Ô tích, có ghi "Đã chọn x/y" | **Tích có hoặc không** dùng dịch vụ đó, không vượt quá giới hạn của hạng (Cơ bản 5, Tiêu chuẩn 7, Cao cấp cả 10). Bỏ tích không làm giảm giá |
| Mua thêm | Ô tích, kèm giá | Tích thì cộng tiền vào tổng |
| Có ở hạng cao hơn | Mờ, có biểu tượng khóa | Chỉ xem, có gợi ý nâng hạng |

- Gia đình **chỉ chọn có dùng dịch vụ hay không**, **không chọn khung giờ**. Giờ cụ thể do Manager và staff xếp sau.
- Trong ngày, nếu một dịch vụ đang kín chỗ (ví dụ cả 4 ghế massage đều có người), staff cho cụ **làm hoạt động khác trước**, xong thì quay lại. Không dùng danh sách chờ cho dịch vụ.
- Gia đình **đổi lựa chọn** trên app được, có hiệu lực **từ tuần sau**.
- **Khách chưa đăng nhập** chỉ xem được **thẻ tóm tắt** của mỗi hạng (tên hạng, giá "từ … đ/ngày", 3–4 quyền lợi chính). Phải đăng nhập mới xem danh sách chi tiết và tích chọn.

**Hệ thống lọc theo lựa chọn ở bước 2 và 3 [ĐỀ XUẤT]**

| Lựa chọn trước đó | Ảnh hưởng tới bước 4 |
|---|---|
| Các nhóm bệnh | Ẩn hạng Cơ bản. Hiện thêm phần "Chăm sóc riêng của nhóm". Dịch vụ có ⚠ ghi chú "cần điều dưỡng cho phép". Giá ghi "chưa gồm phụ phí" |
| `DEMENTIA` | Hiện phần chăm sóc riêng: âm nhạc, đọc báo kể chuyện nhóm hằng ngày |
| Đối tượng `MOBILE` | Hiện đủ 3 hạng và đủ dịch vụ |
| Gói ngày | Chỉ hiện dịch vụ có trong ngày đã đặt. Không bán dịch vụ mua thêm theo tháng |
| Tháng 3 buổi/tuần | Số lượt dịch vụ tính theo các ngày cụ đi |
| Gói tháng, quý, năm | Hiện đầy đủ |

**Khi điều dưỡng đánh giá khác với gia đình khai [ĐỀ XUẤT]:** Manager nhập phụ phí thỏa thuận; nếu đang chọn hạng Cơ bản mà cụ thuộc một nhóm bệnh thì buộc nâng lên Tiêu chuẩn; tự bỏ dịch vụ không phù hợp; gửi lại cho gia đình **xác nhận** trước khi thanh toán. Nếu cụ đang đi và được đánh giá lại thì thay đổi có hiệu lực **từ kỳ sau**.

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
5. Đến 16h30 mà chưa có người đón: cụ chờ ở sảnh với staff trực, không hoạt động và không ăn uống. Hệ thống nhắc gia đình lúc 16h30, 17h00 và 18h30. Quá 19h30 (giờ đóng cửa) thì staff gọi tất cả người được phép đón, ghi sự cố đón trễ và báo Manager (mục 4.3).

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

### 5.11 Care log và chăm sóc hằng ngày

Tham khảo cách làm của Ankota, myEZcare, OneCare, Assistly, MyAdultDayCare (phần mềm bán trú của Mỹ) và Birdie, Person Centred Software (Anh). Mỗi sáng hệ thống tự tạo **danh sách việc trong ngày** cho từng cụ, dựa trên lịch ngày mẫu, các hoạt động gia đình đã tích và nhóm đối tượng của cụ. Staff chỉ làm và ghi các việc có trong lịch; chuyện khác thường thì ghi bằng **"lưu ý / bất thường"**.

**Vai trò và trách nhiệm**

| Vai trò | Trách nhiệm |
|---|---|
| Hộ lý | Check-in, check-out, xác nhận người đón. Ghi ăn uống, vệ sinh, hoạt động, nghỉ trưa, tâm trạng, ảnh, lưu ý bất thường. Ghi nhanh cho cả nhóm. **Hộ lý phụ trách chính chốt care log** của cụ mình phụ trách |
| Điều dưỡng | Đo chỉ số. Cho uống thuốc và ghi lại. Ghi và xử lý sự cố, chuyển viện. Xử lý cảnh báo. Cho phép hoặc không cho dùng dịch vụ ⚠. Phải ghi xong phần của mình trước khi hộ lý chốt |
| Manager | Theo dõi trong ngày. **Chốt thay** nếu staff quên. **Sửa care log đã chốt** (ghi lý do, có log). Xử lý sự cố nặng. Cấu hình ngưỡng, mẫu việc, giờ cảnh báo |
| Admin | Để sau. Được sửa care log đã chốt như Manager |
| Gia đình | Khai danh sách thuốc gửi kèm. Xem **ngay** dòng thời gian, "cụ đang làm gì", ảnh, chỉ số, cảnh báo. Nhận thông báo. Nhắn tin với staff phụ trách (không bình luận vào care log) |
| AI Service | Chỉ phát hiện chỉ số bất thường theo xu hướng. **Không** viết tóm tắt ngày |
| Hệ thống | Tạo danh sách việc mỗi sáng. Nhắc cụ chưa đến, thuốc quá giờ, chưa chốt. Gửi thông báo cho gia đình |

**Các mục care log**

| Mục | Chi tiết ghi | Ai ghi |
|---|---|---|
| Ăn uống | Bữa; lượng ăn (hết, 3/4, 1/2, 1/4, không ăn); số cốc nước; ghi chú nhanh (ho, sặc, chán ăn) | Hộ lý |
| Vệ sinh | Đi vệ sinh, thay quần hoặc tã, bất thường | Hộ lý |
| Hoạt động | Hoạt động trong lịch; mức tham gia (tích cực / có / từ chối); thời lượng | Hộ lý |
| Nghỉ trưa | Giờ ngủ, giờ dậy, ngủ ngon hay không | Hộ lý |
| Tâm trạng | 5 mức (vui, bình thường, buồn, lo âu, kích động); nhóm sa sút trí tuệ có thêm hành vi | Hộ lý |
| Ảnh | Theo giới hạn của hạng (3 / 5 / không giới hạn) | Hộ lý |
| Lưu ý / bất thường | Chuyện khác thường trong ngày, ghi chữ | Hộ lý, điều dưỡng |
| Chỉ số sức khỏe | Huyết áp, mạch, nhiệt độ, SpO₂, đường huyết, cân nặng, nhịp thở (tùy chọn); nhóm sau tai biến có checklist dấu hiệu tái phát | Điều dưỡng |
| Thuốc | Theo danh sách gia đình khai: đã uống / cụ từ chối / chưa có thuốc, kèm lý do | Điều dưỡng |
| Sự cố | Loại, giờ, mức độ, mô tả, ảnh, cách xử lý, đã báo gia đình chưa, chuyển viện | Điều dưỡng (hộ lý báo nhanh) |

**Màn hình app staff**

| Mã | Màn hình | Các mục |
|---|---|---|
| S1 | Ca hôm nay | Ca và giờ ca; số cụ có mặt / chưa đến / đã về; cảnh báo cần xử lý; việc sắp tới trong 30 phút; cụ có lịch mà chưa đến sau 8h30 |
| S2 | Check-in, check-out | Quét QR; check-in hộ khi quên thẻ (chọn lý do); 3 danh sách chưa đến / đang ở / đã về; check-out chọn người đón, hiện ảnh và 4 số cuối CCCD; người lạ thì nút gọi liên hệ chính; sau check-out hiện nút **"Chốt care log"** |
| S3 | Cụ hôm nay | Chỉ cụ đã check-in; ảnh, tên, nhóm, hạng, % việc đã xong, cảnh báo, biểu tượng ⚠ |
| S4 | Care log của một cụ | Đầu trang: ảnh, tên, nhóm, hạng, dị ứng, chế độ kiêng, dịch vụ ⚠ được hay không được dùng, trạng thái **đang mở / đã chốt (ai, lúc nào)**. Tab "Việc hôm nay": việc theo giờ, trạng thái chưa làm / đã làm / bỏ qua (bắt buộc lý do). Tab "Dòng thời gian". Thanh icon ghi nhanh. Nút "Ghi lưu ý / bất thường" |
| S5 | Ghi một mục | Khung bật lên theo từng mục ở bảng trên |
| S6 | Ghi nhanh cả nhóm | Chọn bữa hoặc hoạt động; danh sách cụ có mặt tích sẵn với giá trị mặc định; sửa riêng từng cụ |
| S7 | Đo chỉ số (điều dưỡng) | Các ô chỉ số, hiện ngưỡng của cụ, vượt ngưỡng thì đỏ và tạo cảnh báo; checklist tái phát cho nhóm sau tai biến |
| S8 | Thuốc đến hạn (điều dưỡng) | Danh sách đến hạn / quá hạn / đã xong; mỗi liều có tên, liều, giờ, ảnh vỉ thuốc; nút đã uống / từ chối / chưa có thuốc |
| S9 | Báo sự cố | Loại, giờ, mức độ, mô tả, ảnh, xử lý, đã báo gia đình, chuyển viện (bệnh viện, giờ, người đi kèm) |
| S10 | Cảnh báo | Danh sách cảnh báo theo nguồn; nhận xử lý; ghi kết quả; đóng cảnh báo |

**Màn hình app gia đình**

| Mã | Màn hình | Các mục |
|---|---|---|
| G1 | Hôm nay của cụ | Thẻ **"Cụ đang làm gì"** (ví dụ "Đang tập vật lý trị liệu · từ 9:15"); trạng thái đến và về, ai đón; dòng thời gian cập nhật ngay khi staff ghi; ảnh |
| G2 | Tổng kết ngày | Hệ thống tự gom số liệu đã ghi (không dùng AI): ăn uống, hoạt động, tâm trạng, chỉ số chính, thuốc đã uống, lưu ý |
| G3 | Sức khỏe | Chỉ số mới nhất; biểu đồ tuần và tháng; lịch sử uống thuốc; hạng Cao cấp có báo cáo tháng |
| G4 | Cảnh báo và sự cố | Cảnh báo theo quyền lợi của hạng, mức khẩn cấp luôn hiện; chi tiết sự cố và cách xử lý |
| G5 | Thuốc gửi kèm | Gia đình khai tên thuốc, liều, giờ uống, ảnh vỉ thuốc, ngày bắt đầu và kết thúc; đổi đơn có lưu lịch sử |
| G6 | Cài đặt thông báo **[ĐỀ XUẤT]** | Gia đình tự tắt bớt từng loại thông báo; không tắt được bất thường, sự cố, khẩn cấp |

Gia đình nhận thông báo khi: cụ đến; ăn xong mỗi bữa; bắt đầu hoạt động; có ảnh mới; có chỉ số mới; đã uống thuốc; có lưu ý bất thường hoặc sự cố; cụ sẵn sàng về; cụ đã về.

**Màn hình web Manager**

| Mã | Màn hình | Các mục |
|---|---|---|
| M1 | Vận hành trong ngày | Số cụ có mặt / chưa đến / báo nghỉ / đã về; care log chưa chốt; sự cố mới; cảnh báo chưa xử lý; thuốc quá giờ; cụ chờ đón sau 16h30 |
| M2 | Xem care log | Lọc theo cụ, ngày, staff; xem dòng thời gian và tổng kết |
| M3 | Sự cố và chuyển viện | Danh sách theo mức độ, trạng thái, người xử lý; báo cáo theo tháng |
| M4 | Cài đặt care log | Ngưỡng chỉ số mặc định và riêng từng cụ; mẫu việc trong ngày; giờ cảnh báo chưa đến (8h30); giờ nhắc đón (16h30, 17h00, 18h30); giờ nhắc chốt (18h00) và giờ Manager chốt thay (20h00); quy tắc cảnh báo |
| M5 | Care log trong ngày | Cụ đã chốt / chưa chốt; lưu ý bất thường; **chốt thay**; **sửa care log đã chốt** (bắt buộc lý do, có log) |

**Quy tắc care log**

| Mã | Quy tắc |
|---|---|
| CL-01 | Chỉ ghi care log cho cụ đã check-in hôm đó |
| CL-02 | Bỏ qua một việc thì bắt buộc ghi lý do |
| CL-03 | Chỉ điều dưỡng ghi chỉ số, thuốc, sự cố |
| CL-04 | Ảnh gửi gia đình không vượt giới hạn của hạng |
| CL-05 | Cụ vắng thì việc và thuốc của cụ tự rớt khỏi danh sách hôm đó |
| CL-06 | **Hộ lý phụ trách chính chốt** care log của cụ, thường ngay khi check-out, sau khi điều dưỡng đã ghi xong chỉ số và thuốc. Hệ thống kiểm tra việc còn thiếu trước khi cho chốt. Sau khi chốt, chỉ **Manager hoặc Admin** sửa, bắt buộc lý do, lưu ai sửa, lúc nào, sửa từ gì thành gì |
| CL-07 | Cảnh báo khi: chỉ số vượt ngưỡng; thuốc quá 30 phút; ăn ít (1/4 trở xuống) 2 bữa liền; từ chối thuốc 2 lần liền; tâm trạng kích động; có sự cố; 8h30 chưa đến mà chưa báo nghỉ |
| CL-08 | Mức khẩn cấp luôn gửi gia đình, không phụ thuộc hạng |
| CL-09 | App staff ghi được khi mất mạng, có mạng lại thì tự đồng bộ |
| CL-10 | Staff chỉ ghi các việc có trong lịch của cụ; chuyện khác thường ghi bằng "lưu ý / bất thường" |
| CL-11 | 18h00 chưa chốt thì nhắc staff phụ trách; 20h00 vẫn chưa chốt thì Manager chốt thay |

**Để làm sau:** ghi chú bằng giọng nói.

## 6. Business rules

| Mã | Quy tắc |
|---|---|
| BR-01 | Hệ thống phục vụ một trung tâm duy nhất |
| BR-02 | Một tài khoản Family quản lý được nhiều cụ. Mỗi cụ có một **người liên hệ chính** |
| BR-03 | Mỗi cụ chỉ có **một subscription chính đang hiệu lực** tại một thời điểm, cộng thêm các dịch vụ lẻ |
| BR-04 | Tính năng trên app của Family được bật hoặc tắt theo quyền lợi của gói đang hiệu lực (mục 4.1) |
| BR-10 | Chỉ điều dưỡng được đánh giá đầu vào. Chỉ Manager được chốt đối tượng của cụ |
| BR-11 | Các nhóm bệnh (`CHRONIC`, `REHAB`, `DEMENTIA`, `STROKE`) không mua được hạng Cơ bản |
| BR-13 | Gia đình chỉ tích chọn dịch vụ có trong gói, không vượt quá số dịch vụ tự chọn của hạng. Đổi lựa chọn có hiệu lực từ tuần sau |
| BR-14 | Khách chưa đăng nhập chỉ xem thẻ tóm tắt của từng hạng |
| BR-15 | Dịch vụ có dấu ⚠ (ghế massage, ngâm chân, cắt móng cho cụ tiểu đường) chỉ dùng được cho các nhóm bệnh khi điều dưỡng đã cho phép |
| BR-16 | Mỗi cụ thuộc một nhóm chính; nhiều bệnh thì xếp theo nhóm có mức chăm sóc cao nhất |
| BR-17 | Phụ phí theo nhóm do Manager thỏa thuận với gia đình và nhập khi duyệt; gia đình phải xác nhận giá cuối trên app trước khi thanh toán |
| BR-18 | Không nhận cụ nằm liệt giường hoàn toàn, sa sút trí tuệ nặng, hoặc cần chăm sóc tích cực |
| BR-19 | Không thu đặt cọc; mọi khoản thanh toán trả trước qua cổng thanh toán |
| BR-12 | Đánh giá lại mức độ định kỳ mỗi 3 tháng, hoặc khi sức khỏe thay đổi. Mức đổi thì giá đổi từ kỳ sau |
| BR-20 | Đã thanh toán thì **không hoàn tiền** khi cụ nghỉ hoặc gia đình dừng gói, trừ trường hợp qua đời (5.9) |
| BR-21 | Gói `DAY`: báo nghỉ trước **17h ngày hôm trước** thì không mất tiền ngày đó; tiền ngày đó được giữ thành **số dư** để trừ vào lần đặt sau |
| BR-22 | Nhập viện có giấy tờ thì được bảo lưu tối đa 30 ngày |
| BR-23 | Nhắc gia hạn trước 7 ngày. Hết hạn chưa đóng thì `SUSPENDED` |
| BR-24 | Thanh toán chỉ qua cổng thanh toán, không thu tiền mặt |
| BR-25 | Manager nhập lịch nghỉ lễ, Tết và gửi thông báo cho gia đình. Ngày nghỉ không tính buổi; gói tháng được cộng bù số ngày nghỉ lễ |
| BR-26 | Giá gói tháng cố định một mức, không phụ thuộc tháng có bao nhiêu ngày đi được |
| BR-30 | Chỉ giao cụ cho người có trong danh sách người được phép đón. Mọi lần đón đều được ghi lại |
| BR-35 | Mỗi cụ có một thẻ QR để check-in và check-out |
| BR-31 | Không check-in được nếu subscription không `ACTIVE`, hoặc nếu hôm đó không thuộc lịch của gói (ví dụ gói M3 đi vào thứ Ba) |
| BR-34 | Giờ chăm sóc 7h–16h30. Từ 16h30 đến giờ đóng cửa (19h30) chỉ là chờ đón, miễn phí, không hoạt động và không ăn uống. Không có gói ở lại muộn |
| BR-32 | Chỉ điều dưỡng được ghi chỉ số sức khỏe. Hộ lý ghi ăn uống, vệ sinh, hoạt động, ảnh |
| BR-33 | Staff chỉ thấy các cụ được phân công trong ca của mình |
| BR-40 | Staff chỉ nhắn tin được với Family của các cụ mình phụ trách. Toàn bộ tin nhắn được lưu. Manager chỉ mở lịch sử tin nhắn khi có khiếu nại hoặc khi Family yêu cầu, và việc mở được ghi vào audit log |
| BR-50 | AI chỉ gợi ý. Lịch ca và thực đơn phải được Manager duyệt mới có hiệu lực |
| BR-51 | Dữ liệu gửi sang AI phải ẩn thông tin cá nhân (tên, CCCD, số điện thoại) |
| BR-70 | Tổng số lượng phòng, giường, thiết bị chỉ do Manager nhập hoặc sửa. Hệ thống chỉ thay đổi **số dùng được** qua báo hỏng, sửa xong và kiểm kê |
| BR-71 | Không bán gói và không xếp cụ vượt sức chứa của hạng đó. Cụ nhóm `DEMENTIA` chỉ được xếp vào khu có kiểm soát ra vào |
| BR-72 | Thiết bị dùng được thấp hơn định mức tối thiểu thì cảnh báo Manager và ghi vào báo cáo |
| BR-73 | Phòng tạm đóng thì không xếp lịch hay giường vào. Cụ Cao cấp bị ảnh hưởng được chuyển tạm sang phòng tương đương |
| BR-74 | Chỗ chia cứng theo hạng, bằng số giường nghỉ trưa của hạng đó. Không đẩy cụ hạng thấp ra ngoài để nhường chỗ cho hạng cao |
| BR-75 | Danh sách chờ xếp theo hạng cao trước, sau đó ai đăng ký trước. Giữ chỗ 24 giờ để thanh toán |
| BR-76 | Giường cố định của cụ Cao cấp được giữ trống cả khi cụ báo nghỉ |
| BR-77 | Quyền lợi bị mất do cơ sở vật chất gặp sự cố phải được bù theo bảng ở mục 4.8 và báo cho gia đình |
| BR-78 | Số cụ tối đa trong một khung VLTL không vượt quá số chỗ phục vụ cùng lúc của thiết bị đang dùng được |
| BR-60 | Phần quyền của Admin **để sau**; tạm thời Admin chỉ xem số liệu tổng hợp |
| BR-61 | Báo cáo gửi Admin do hệ thống tự tạo theo tuần và tháng; Manager thêm nhận xét rồi gửi |
| BR-52 | Chatbot trả lời dựa trên FAQ và thông tin gói do Manager nhập; không trả lời được thì chuyển thành tin nhắn tới Manager |

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
- `centers` (nhiều trung tâm) → gộp vào `center_settings` dạng 1 dòng, chứa giờ chăm sóc (7h–16h30), giờ đóng cửa (19h30), chính sách, FAQ cho chatbot.
- `messages.channel` = `CENTER_ADMIN` → bỏ.

**Giữ, có sửa**
- `service_packages`: thêm `tier`, `billing_cycle` (DAY/M3/MONTH/Q/Y), `weekdays`, `base_price`, `allowed_target_groups`.
- `registrations` → đổi tên thành `subscriptions`: thêm `target_group` (MOBILE/CHRONIC/REHAB/DEMENTIA/STROKE), `surcharge_amount`, `surcharge_note`, `status` (PENDING_ASSESSMENT / AWAITING_PAYMENT / ACTIVE / PAUSED / SUSPENDED / TERMINATED / EXPIRED), `paused_until`.
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
| `target_groups` | 5 nhóm đối tượng: tên, mô tả, hạng tối thiểu, chu kỳ đánh giá lại, các dịch vụ chăm sóc riêng của nhóm |
| `services` | Danh mục dịch vụ do Manager quản lý: nhóm, mô tả, ảnh, thời lượng, thiết bị cần dùng, cần điều dưỡng cho phép không, giá mua lẻ, trạng thái |
| `package_services` | Gói gồm dịch vụ nào: loại (có sẵn / tự chọn / mua thêm), số lượt mỗi tuần, áp dụng cho thời hạn và đối tượng nào, giá |
| `subscription_service_choices` | Dịch vụ gia đình đã tích chọn, ngày hiệu lực |
| `service_permissions` | Điều dưỡng cho phép hoặc không cho phép cụ dùng dịch vụ có dấu ⚠, kèm lý do và ngày đánh giá lại |
| `subscription_add_ons` | Dịch vụ lẻ đã mua (dịch vụ lấy từ bảng `services`) |
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
| `daily_tasks` | Danh sách việc trong ngày của từng cụ, tạo tự động mỗi sáng: giờ, loại việc, người làm, trạng thái (chưa làm / đã làm / bỏ qua), lý do bỏ qua |
| `care_log_entries` | Từng ghi chép: cụ, loại mục, giá trị (ăn uống, vệ sinh, hoạt động, nghỉ trưa, tâm trạng, lưu ý), người ghi, giờ ghi |
| `care_log_days` | Care log của một cụ trong một ngày: trạng thái mở hoặc đã chốt, người chốt, giờ chốt |
| `care_log_edits` | Lịch sử sửa sau khi chốt: ai sửa, lúc nào, giá trị cũ, giá trị mới, lý do |
| `medication_plans` | Thuốc gia đình khai: tên, liều, giờ uống, ảnh vỉ thuốc, ngày bắt đầu, ngày kết thúc |
| `medication_administrations` | Mỗi liều trong ngày: đã uống / từ chối / chưa có thuốc, người cho uống, giờ thật, lý do |
| `incidents` | Sự cố: loại, giờ, mức độ, mô tả, ảnh, xử lý, đã báo gia đình, liên kết chuyển viện |
| `notification_preferences` | Loại thông báo gia đình đã tắt |
| `manager_reports` | Báo cáo tuần và tháng hệ thống tự tạo, Manager thêm nhận xét rồi gửi Admin |
| `center_holidays` | Lịch nghỉ lễ, Tết do Manager nhập |
| `announcements` | Thông báo chung Manager gửi tới tất cả hoặc một nhóm gia đình |
| `account_credits` | Số dư của gia đình (tiền gói ngày báo nghỉ đúng hạn), trừ vào lần đặt sau |
| `late_pickup_incidents` | Sự cố đón trễ quá giờ đóng cửa |

## 9. Câu hỏi còn mở

1. **Phần quyền của Admin** (có xem hồ sơ sức khỏe từng cụ không, dashboard gồm gì): **để sau**.
