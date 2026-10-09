# An Tâm Care — Câu hỏi lấy ý kiến nhóm

> Dùng kèm tài liệu **Phân tích nghiệp vụ (bản 2)**. Mỗi câu có sẵn **đề xuất**. Nhóm ghi vào cột "Ý kiến nhóm": **Đồng ý** / **Sửa: …** / **Bỏ**.
> Những câu đánh dấu ⭐ là câu ảnh hưởng tới **thiết kế database**, cần chốt trước.

## Phần A. Các vấn đề còn tồn đọng

| # | Vấn đề | Vì sao cần chốt |
|---|---|---|
| 1 | Một số quy tắc về **tiền** chưa chốt: đặt cọc, tiền mặt, số dư, ngày lễ, hủy trước khi bắt đầu | Quyết định cấu trúc hóa đơn và thanh toán |
| 2 | **Quyền riêng tư** chưa rõ: Admin xem hồ sơ sức khỏe, Manager xem tin nhắn, ảnh có cụ khác trong khung hình | Ảnh hưởng ma trận phân quyền |
| 3 | **Tài khoản** chưa rõ: một cụ có mấy Family, có bao nhiêu Manager, cách đăng nhập | Ảnh hưởng bảng `users` và quan hệ Family–cụ |
| 4 | **Giờ giấc** chưa đủ: giờ đóng cửa, ngày làm việc trong tuần, phụ thu đón trễ | Ảnh hưởng gói ở lại muộn và lịch ca |
| 5 | **Sức khỏe** chưa rõ: ngưỡng cảnh báo, có quản lý việc cho uống thuốc không | Ảnh hưởng bảng chỉ số và cảnh báo |
| 6 | **Nhân sự** chưa rõ: chấm công đầu ca, staff dùng web hay chỉ app | Ảnh hưởng bảng ca làm |
| 7 | **AI và chatbot** chưa rõ: chatbot lấy dữ liệu từ đâu, khi không trả lời được thì chuyển cho ai | Ảnh hưởng luồng chatbot |
| 8 | Một số con số mình **tự đề xuất** cần nhóm xác nhận: giảm giá gói quý/năm, chu kỳ đánh giá lại, hạn báo nghỉ | Dùng làm dữ liệu mẫu và business rules |
| 9 | Chưa có **ERD hoàn chỉnh** (khoảng 55 bảng) | Làm sau khi chốt các câu ⭐ |

## Phần B. Câu hỏi theo nhóm

### B1. Tài khoản và phân quyền

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 1 ⭐ | Một cụ có thể có **nhiều tài khoản Family** cùng theo dõi không (anh chị em)? | Có. Một người là **liên hệ chính** (thanh toán, ký, duyệt), những người còn lại chỉ xem | |
| 2 ⭐ | Trung tâm có **một hay nhiều tài khoản Manager**? Có cần vai trò lễ tân hoặc kế toán riêng không? | Một hoặc nhiều Manager, cùng quyền. Không tách vai trò lễ tân, kế toán | |
| 3 | **Admin** có được xem hồ sơ sức khỏe chi tiết của từng cụ không? | Không, chỉ xem số liệu tổng hợp | |
| 4 | **Manager** có được xem tin nhắn giữa staff và gia đình không? | Chỉ mở khi có khiếu nại hoặc gia đình yêu cầu; mỗi lần mở đều ghi log | |
| 5 ⭐ | Family **đăng nhập** bằng gì? | Số điện thoại + mật khẩu; quên mật khẩu thì xác thực bằng OTP | |
| 6 | **Thông báo** gửi qua kênh nào? | Push trên app và email. Không dùng SMS (tốn phí) | |
| 7 | Staff dùng **chỉ app** hay cả web? | Chủ yếu app; điều dưỡng được dùng thêm web để xem báo cáo sức khỏe | |
| 8 | Gia đình thấy được thông tin gì của staff phụ trách? | Tên, ảnh, chức vụ. Không thấy số điện thoại cá nhân | |

### B2. Gói dịch vụ và đăng ký

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 9 | Gói **quý / năm** giảm giá bao nhiêu? | Quý giảm 5%, năm giảm 10% | |
| 10 | Có **ngày đi thử** với giá riêng không? | Có, dùng gói ngày, giá bằng gói ngày hạng Cơ bản | |
| 11 | Có **mã giảm giá, khuyến mãi** không? | Chưa làm ở phiên bản đầu | |
| 12 | Dùng thang **Barthel (ADL)** để chấm mức độ chăm sóc? | Có, để phân loại khách quan | |
| 13 | **Đánh giá lại** mức độ bao lâu một lần? | Mỗi 3 tháng, hoặc khi sức khỏe thay đổi; giá đổi từ kỳ sau | |
| 14 | **Nâng / hạ hạng** áp dụng thế nào? | Nâng hạng có hiệu lực ngay, trả phần chênh lệch cho số ngày còn lại. Hạ hạng có hiệu lực từ kỳ sau | |
| 15 | **Hợp đồng** ký online trên app hay ký giấy tại trung tâm? | Ký giấy khi đánh giá đầu vào; app lưu bản scan | |
| 16 | Đặt **lịch tham quan**: khách cần tài khoản không? | Không cần, chỉ nhập tên và số điện thoại | |

### B3. Thanh toán và tiền

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 17 ⭐ | Có thu **đặt cọc** không? | Không thu cọc, vì đã trả trước | |
| 18 ⭐ | Có cho **trả tiền mặt** tại quầy (Manager ghi nhận) không? | Có, cho gia đình không quen thanh toán online | |
| 19 ⭐ | Gói ngày báo nghỉ đúng hạn thì tiền ngày đó được **hoàn qua cổng thanh toán** hay **giữ thành số dư**? | Giữ thành số dư, trừ vào lần đặt sau | |
| 20 | **Hạn báo nghỉ** của gói ngày? | Trước 17h ngày hôm trước | |
| 21 | Đã thanh toán nhưng **hủy trước ngày bắt đầu** thì sao? | Hủy trước 3 ngày thì hoàn 100%; sau đó không hoàn | |
| 22 | Có cần **xuất hóa đơn VAT** / hóa đơn điện tử không? | Chưa làm ở phiên bản đầu, chỉ có hóa đơn trong hệ thống | |
| 23 | Qua đời: hoàn phần chưa dùng của gói dài hạn. Dịch vụ lẻ đã dùng có hoàn không? | Không hoàn dịch vụ lẻ đã dùng | |

### B4. Giờ giấc và ngày hoạt động

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 24 ⭐ | Trung tâm **đóng cửa** lúc mấy giờ (giới hạn của gói ở lại muộn)? | 18h | |
| 25 | **Ngày làm việc**: thứ 2 tới thứ 7, nghỉ Chủ nhật? | Đúng, khớp với gói 26 ngày/tháng | |
| 26 ⭐ | **Ngày lễ, Tết**: nghỉ hay mở cửa có phụ thu? Gói tháng có trừ ngày lễ không? | Nghỉ lễ, Tết; gói tháng được cộng bù số ngày nghỉ lễ | |
| 27 | Không có gói ở lại muộn mà **đón trễ** thì phụ thu bao nhiêu? | 50.000đ mỗi 30 phút | |
| 28 | In **thẻ QR** cho mỗi cụ để check-in? | Có | |

### B5. Sức khỏe và chăm sóc

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 29 ⭐ | **Ngưỡng cảnh báo** chỉ số dùng chung hay chỉnh riêng cho từng cụ? | Có ngưỡng mặc định; điều dưỡng chỉnh riêng được cho từng cụ | |
| 30 | Staff có **cho cụ uống thuốc** gia đình gửi không? Hệ thống có ghi "đã cho uống" không? | Có ghi nhận đơn giản (tên thuốc, giờ, đã uống chưa). Không kê đơn | |
| 31 | Cảnh báo AI gửi tới ai? | Điều dưỡng trực, Manager; gia đình nếu gói có quyền lợi này. Mức khẩn cấp thì gia đình luôn nhận | |
| 32 | Ảnh trong care log **có cụ khác** trong khung hình thì sao? | Gia đình ký đồng ý chụp ảnh khi đăng ký; ảnh nhóm chỉ gửi cho gia đình đã đồng ý | |

### B6. Nhân sự

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 33 ⭐ | Staff có **chấm công đầu ca** trên app không? | Có check-in và check-out ca | |
| 34 | Hệ thống có **tính lương** không? | Không, ngoài phạm vi | |
| 35 | Một staff phụ trách tối đa bao nhiêu cụ? | Theo tỷ lệ của hạng gói (1:8 / 1:6 / 1:4) | |

### B7. Cơ sở vật chất

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 36 | Cụ **làm hỏng đồ** của trung tâm thì xử lý thế nào? | Hao mòn thì trung tâm chịu. Hỏng do cố ý thì lập biên bản, Manager quyết định có tính phí hay không | |
| 37 | Cho Manager **nhập thiết bị hàng loạt bằng Excel**? | Có | |
| 38 | Trung tâm có **bao nhiêu chỗ và giường** mỗi hạng (để làm dữ liệu mẫu)? | 40 chỗ: 10 Cao cấp, 15 Tiêu chuẩn, 15 Cơ bản; khu sa sút trí tuệ 6 chỗ | |

### B8. AI, chatbot và báo cáo

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 39 | Chatbot trả lời dựa trên dữ liệu gì? | FAQ và thông tin gói do Manager nhập. Với Family thì thêm lịch và hóa đơn của chính họ | |
| 40 | Chatbot không trả lời được thì chuyển cho ai? | Chuyển thành tin nhắn tới Manager | |
| 41 | Dữ liệu gửi sang AI có ẩn thông tin cá nhân không? | Có: ẩn tên, CCCD, số điện thoại | |
| 42 | **Báo cáo gửi Admin** tự tạo hay Manager tự soạn? | Hệ thống tự tạo theo tuần và tháng; Manager thêm nhận xét rồi gửi | |

### B9. Kỹ thuật (để nhóm thống nhất trước khi code)

| # | Câu hỏi | Đề xuất | Ý kiến nhóm |
|---|---|---|---|
| 43 | App mobile làm bằng gì? Chạy Android, iOS hay cả hai? | Flutter hoặc React Native, cả hai nền tảng | |
| 44 | Backend dùng công nghệ gì? | Nhóm chọn: .NET / Node.js / Spring Boot | |
| 45 | Ngôn ngữ app chỉ tiếng Việt? | Chỉ tiếng Việt ở phiên bản đầu | |
| 46 | Lưu dữ liệu của cụ bao lâu sau khi chấm dứt hợp đồng? | 2 năm, sau đó ẩn danh | |
