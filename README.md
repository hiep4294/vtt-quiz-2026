# VTT Quiz 2026 - Nhóm 2

Web app trắc nghiệm tĩnh, lấy ngẫu nhiên **50 câu** từ ngân hàng 340 câu và giữ đúng tỷ lệ 14 mục tiêu được cung cấp.

## Chức năng

- Nhấn **Bắt đầu làm bài** để sinh đề mới.
- Chọn thời gian 30, 45, 60 hoặc 90 phút; mặc định 60 phút.
- Đồng hồ đếm ngược và tự nộp khi hết giờ.
- Đảo ngẫu nhiên nội dung A/B/C/D riêng cho từng câu ở mỗi đề; vẫn chấm theo đáp án gốc.
- Điều hướng 50 câu, đánh dấu câu cần xem lại, tự lưu tiến độ trên trình duyệt.
- Chỉ cho nộp sớm khi đã trả lời đủ 50 câu.
- Sau khi nộp: điểm số, thống kê theo mục tiêu, đáp án và tài liệu liên quan.

## Chạy trên máy

Không cần cài thư viện frontend:

```powershell
python -m http.server 4173
```

Mở `http://localhost:4173`.

Chạy kiểm thử:

```powershell
npm test
```

## Quy tắc lấy câu

Cấu hình nằm trong `quiz-core.js` và khớp đúng ảnh yêu cầu: 14 mục tiêu, tổng 50 câu.

PDF không có cột "Tên mục tiêu". Quy tắc gắn nhóm đang dùng là:

- `VTT1` → CSSPV, `VTT2` → KDSPV, `VTT3` → TTC, `VTT4` → DCTC.
- Với bốn nhóm trên: mã `01-30` là `_n2`, mã từ `31` là `_chung`.
- `VTT5` → TDT chung, `VTT6` → QLRRHĐ chung, `VTT7` → PC chung.
- `VTT8` → TTTM chung, `VTT9` → QLRRTD chung, `VTT10` → KN chung.

Nếu đơn vị tổ chức có bảng ánh xạ chính thức khác, chỉ cần sửa `pool_for()` trong `tools/extract_questions.py`, sinh lại dữ liệu rồi chạy test.

## Sinh lại dữ liệu từ PDF

PDF nguồn không được đưa vào repo. Chạy:

```powershell
python tools/extract_questions.py "C:\duong-dan\bo-cau-hoi.pdf" data/questions.js
```

## Bảo mật

PDF nguồn ghi **TUYỆT MẬT**. Không xuất bản repo hoặc GitHub Pages ở chế độ công khai nếu chưa có phê duyệt. Với web tĩnh, dữ liệu câu hỏi và đáp án nằm ở phía trình duyệt nên không phù hợp cho kỳ thi cần chống gian lận; app này phù hợp cho luyện tập hoặc sử dụng nội bộ có kiểm soát.
