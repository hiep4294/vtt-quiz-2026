# VTT Quiz 2026 - Nhóm 1 & 2

Web app trắc nghiệm tĩnh, lấy ngẫu nhiên **50 câu** từ ngân hàng 480 câu, đúng cơ cấu **40 câu Cơ bản + 10 câu Nâng cao** và 17 mục tiêu.

## Chức năng

- Nhấn **Bắt đầu làm bài** để sinh đề mới.
- Chọn thời gian 30, 45, 60 hoặc 90 phút; mặc định 60 phút.
- Đồng hồ đếm ngược và tự nộp khi hết giờ.
- Giữ nguyên thứ tự và nội dung phương án **A–B–C–D** như dữ liệu nguồn.
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

Cấu hình nằm trong `quiz-core.js`: 17 mục tiêu, tổng 50 câu. Mỗi đề luôn có đúng **40 câu Cơ bản + 10 câu Nâng cao**. Ba mục tiêu CSSPV, KDSPV và TTC đều được chia cân bằng thành **2 câu Nhóm 1 + 2 câu Nhóm 2**; phần chung của từng mục tiêu vẫn lấy 4 câu.

PDF không có cột "Tên mục tiêu". Quy tắc gắn nhóm đang dùng là:

- `VTT1` → CSSPV, `VTT2` → KDSPV, `VTT3` → TTC, `VTT4` → DCTC.
- Với dữ liệu PDF ban đầu: mã `01-30` thuộc `_n2`, mã từ `31` thuộc `_chung` theo quy tắc trích xuất cũ.
- Với dữ liệu Excel bổ sung: `câu hỏi pmo.xlsx` → CSSPV, `GM.xlsx` → KDSPV, `on tap 1.xlsx` → TTC; cột Nhóm 1/Nhóm 2/Chung quyết định hậu tố `_n1`/`_n2`/`_chung`.
- Với `nang cao FI.xlsx`: nhãn `Nhóm 1_CS & SP` → `CSSPV_n1`, `Nhóm 2_KDSPV` → `KDSPV_n2`; câu chung về khách hàng ĐCTC → `DCTC_chung`, câu chung về sản phẩm FI → `KDSPV_chung`.
- `VTT5` → TDT chung, `VTT6` → QLRRHĐ chung, `VTT7` → PC chung.
- `VTT8` → TTTM chung, `VTT9` → QLRRTD chung, `VTT10` → KN chung.

Đợt nhập dữ liệu ngày 20/08/2026 đã đối chiếu 266 dòng Excel với dữ liệu hiện có: loại 154 câu trùng trực tiếp và 5 câu gần trùng đã rà thủ công, sau đó thêm 107 câu mới. PDF Nhóm 2 đính kèm trùng toàn bộ 340 câu cũ nên không thêm lại. Các ô mức độ để trống được chuẩn hóa thành `Cơ bản`.

Nếu đơn vị tổ chức có bảng ánh xạ chính thức khác, chỉ cần sửa `pool_for()` trong `tools/extract_questions.py`, sinh lại dữ liệu rồi chạy test.

## Sinh lại dữ liệu từ PDF

PDF nguồn không được đưa vào repo. Chạy:

```powershell
python tools/extract_questions.py "C:\duong-dan\bo-cau-hoi.pdf" data/questions.js
```

## Bảo mật

PDF nguồn ghi **TUYỆT MẬT**. Không xuất bản repo hoặc GitHub Pages ở chế độ công khai nếu chưa có phê duyệt. Với web tĩnh, dữ liệu câu hỏi và đáp án nằm ở phía trình duyệt nên không phù hợp cho kỳ thi cần chống gian lận; app này phù hợp cho luyện tập hoặc sử dụng nội bộ có kiểm soát.
