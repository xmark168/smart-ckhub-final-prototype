# Bài đăng — nghiên cứu UX và nghiệp vụ CK Hub

Ngày: 07/10/2026. Phạm vi: đánh giá prototype và đề xuất; chưa thay đổi chức năng.

## Kết luận

Giữ một hồ sơ bài dùng chung cho Content Plan và Tiến độ. Bổ sung góc nhìn rà nhanh cả kế hoạch, quyền làm việc đúng vai trò và các mốc bàn giao có người chịu trách nhiệm. Phân công, bản được duyệt và kết quả xuất bản phải lưu lâu dài trên hồ sơ bài; việc nhắc chỉ đọc theo hồ sơ này.

Hai câu hỏi chính của trang:

- Content: tháng/chu kỳ này làm nội dung gì, mở bài nào để viết, bài nào cần sửa?
- Account: bài đang ở đâu, ai cần xử lý tiếp, có kịp lịch đăng và đủ định mức không?

Media cần nhận đúng brief đã duyệt, tìm source/bản dựng và phản hồi chỉnh sửa. BODs cần tổng hợp; không cần mở vùng viết làm giao diện mặc định.

## Căn cứ và giới hạn

- Đọc luồng hiện có trong PostsScreen, ContentPlanWorkspace, ContentItemModal, ContentTab, contentExcel, scope, routes và syncTasks.
- Tổng hợp yêu cầu trong chat: chuyển từ Excel thuận tiện; tránh bảng phải kéo ngang; Content phụ trách script/nội dung; phân quyền theo dự án; xem cả chu kỳ đã chốt; bỏ checklist ở bài đăng; tính đúng/trễ theo ngày đăng dự kiến và thực tế.
- Cấu trúc sheet đã được rà ở các lượt trước: STT, Nhiệm vụ, Thể loại, Chủ đề, Ý tưởng chung, Ý tưởng triển khai nội dung, Ý tưởng triển khai hình ảnh, Định dạng. Một ô có thể chứa nhiều dòng thoại, cảnh quay, caption/poster; không ép tách nội dung tự động.
- Lần nghiên cứu này công cụ web không mở lại được Google Sheet. Không xác nhận sheet có thay đổi mới. Phân tích sheet dùng cấu trúc đã ghi nhận trước đó.
- Nguồn ngoài là hướng dẫn chính thức của sản phẩm, không phải kết quả kiểm thử với nhân sự CK Hub. Chưa đo thời gian thao tác hay tỷ lệ lỗi. Các mục tiêu kiểm thử phía dưới là tiêu chí đề xuất.
- Người dùng xác nhận hiện ghi nhận duyệt thủ công rồi cập nhật lên hệ thống. V1 dùng cơ chế này; đề xuất Account ghi nhận kết quả, chưa cần tài khoản hoặc link duyệt cho khách. Kênh giao tiếp với khách chưa được xác nhận.

## Bài học từ nguồn tham khảo

Buffer tách nháp, yêu cầu duyệt và quyền đưa bài vào hàng chờ. Người cần duyệt chỉ sửa/gửi duyệt nháp của mình; người có quyền đầy đủ duyệt hoặc trả lại. Bài học cho CK Hub: quyền viết và quyền duyệt/đăng phải riêng. [Buffer: Managing and approving draft posts](https://support.buffer.com/en-us/articles/managing-and-approving-draft-posts-57li7M8tDA).

Planable có duyệt bắt buộc, phân người duyệt và khóa bài sau duyệt; có thể hủy duyệt để sửa. CK Hub cần biết bản nào được duyệt, tránh bản đang sửa vẫn mang dấu đã duyệt. [Planable: Approvals and Approval Workflows](https://help.planable.io/hc/en-us/articles/21715462785180-Approvals-and-Approval-Workflows).

Planable dùng nhiều góc nhìn cho cùng nội dung. Calendar có tuần/tháng và vùng riêng cho bài chưa có ngày giờ. Bài học: lịch không thay thế danh sách nội dung chưa xếp lịch. [Planable: Calendar view](https://help.planable.io/hc/en-us/articles/21715383136924-Calendar-view).

Hootsuite mô tả nhập hàng loạt qua các bước tải file, rà lỗi, chỉnh từng bài, rồi lên lịch. CK Hub nên giữ bước xem trước và phân biệt bài mới/cập nhật/bỏ qua trước khi ghi dữ liệu. [Hootsuite: Bulk schedule your posts](https://help.hootsuite.com/s/article/bulk-schedule).

Planable nhập CSV theo mẫu định sẵn. Đây là tham khảo cho bước nhập hàng loạt; CK Hub nên tiếp tục nhận XLSX và ghép cột vì sheet làm việc chứa brief nhiều dòng, không chỉ caption đã sẵn sàng xuất bản. [Planable: Import posts](https://help.planable.io/hc/en-us/articles/21715324907804-Import-posts-in-Planable).

## Hiện trạng → vấn đề

| Phát hiện trong prototype | Hệ quả với người dùng | Hướng xử lý |
|---|---|---|
| Content/Media ở vai trò Partner không được mở trang Bài đăng; canEditProject chỉ cho Account sửa | Vùng viết đẹp nhưng Content chưa thể dùng để làm việc | Mở workspace theo quyền dự án và phân công, kiểm tra quyền theo từng hành động |
| Tên phụ trách đọc từ task Script/Dựng; task đóng lâu hơn 30 ngày có thể bị dọn | Bài cũ mất tên; bài chưa có hạn có thể chưa có task | Lưu phân công trên bài, task dùng cùng nguồn |
| Task Dựng mặc định lấy toàn bộ Media trong buổi quay của chu kỳ | Có tên nhưng chưa chắc đúng người dựng bài | Giao người quay ở buổi shooting; giao người dựng/thiết kế ở bài, không tự coi là một |
| Bảng Tiến độ có hạn dựng nhưng không lộ rõ hạn Content | Khó nhận biết Content đang chậm trước khi trễ ngày đăng | Hiện hạn của bước cần xử lý tiếp; giữ các hạn còn lại trong chi tiết |
| Một stage tổng điều khiển trạng thái mọi kênh | Facebook đã đăng/TikTok chưa đăng khó mô tả đúng | Mỗi kênh có trạng thái, ngày giờ thực tế và link riêng |
| Đổi stage ở tab dự án tự điền publishedAt và postDate; modal lại yêu cầu nhập ngày thực tế | Hai cách thao tác cho kết quả khác nhau; có thể ghi ngày giả | Một hành động ghi nhận đã đăng dùng chung, bắt xác nhận ngày thực tế; không tự đổi ngày kế hoạch |
| Content Plan và tab Bài đăng trong dự án có cách thao tác khác nhau | Nhân sự học hai giao diện cho cùng bài | Dùng cùng thành phần và cùng quy tắc; tab dự án chỉ khóa phạm vi dự án |
| Vùng viết từng bài không có cách rà nhanh cả kế hoạch | Khó cân đối chủ đề, thương hiệu/bán hàng và định dạng cả tháng | Danh sách gọn để rà; mở một bài để viết dài |
| Chọn dự án giữ trạng thái lọc giai đoạn cũ, mặc định tất cả chu kỳ | Có thể tưởng mất bài hoặc không hiểu vì sao chỉ xem | Tự chọn chu kỳ chạy; hiển thị chip bộ lọc, số kết quả và nút xóa lọc |
| Lưu nội dung và bàn giao đều chưa có mốc riêng | Không rõ ai nhận việc tiếp hoặc đang chờ ai | Lưu nháp riêng với Gửi duyệt/Bàn giao; ghi người, thời điểm và phiên bản |

## Cấu trúc trang đề xuất

### Trang Bài đăng toàn công ty

Mặc định Tiến độ, ưu tiên chu kỳ đang chạy của dự án trong quyền truy cập. Không trộn lịch sử vào hàng việc hàng ngày; bộ lọc Lịch sử vẫn cho xem tất cả chu kỳ đã chốt.

Thanh lọc chính: Dự án, Chu kỳ, Người phụ trách. Các nhóm nhanh: Cần tôi xử lý, Chờ duyệt, Đến hạn, Trễ hạn, Chưa phân công. Giai đoạn/định dạng/kênh nằm trong bộ lọc mở rộng. Không hiển thị đồng thời nhiều thanh điều khiển có độ nổi bật ngang nhau.

Mỗi dòng trả lời đủ: bài gì, dự án nào, ai đang cần làm, bước tiếp theo, hạn tiếp theo, ngày đăng kế hoạch, kết quả đăng. Content và Media có thể xem trong dòng mở rộng để tránh bảng quá rộng.

Đúng/trễ đăng vẫn tính theo ngày đăng dự kiến và thực tế. Chậm script/dựng là cảnh báo sản xuất riêng; không nhập chung thành một con số “Trễ hạn”. Bài đã đăng trễ tách với bài quá hạn chưa đăng trong thống kê.

### Khi chọn một dự án và chu kỳ

Hai chế độ chính: Content Plan và Tiến độ. Content Plan có hai cách dùng bên trong:

- Rà kế hoạch: danh sách gọn, cùng lúc thấy nhiều chủ đề; sửa nhanh nhiệm vụ, định dạng, phân công và lịch. Không đưa các ô script dài vào bảng cuộn ngang.
- Viết bài: mở từ một dòng; danh sách bài bên trái, vùng viết dọc bên phải. Có thể trở lại đúng dòng đang chọn.

Chọn dự án tự chọn chu kỳ đang chạy; nếu không có, chọn chu kỳ gần nhất và ghi rõ chế độ xem. Bộ chọn luôn có chu kỳ đã chốt. Chu kỳ nháp/chưa bắt đầu dùng trạng thái trống có hướng dẫn phù hợp, không bảo người dùng đổi dự án khi họ đã chọn đúng dự án.

Không thêm tab Thư mục đã bị người dùng yêu cầu bỏ. Không thêm lại Plan & tải việc. Lịch tuần/tháng là bước sau, dùng để rà nhịp đăng khi danh sách đã ổn.

### Chi tiết một bài

Phần đầu: tên bài, dự án/chu kỳ, định dạng, người phụ trách và hành động tiếp theo.

Ba vùng thông tin:

1. Nội dung: nhiệm vụ, thể loại, brief và các mục linh hoạt.
2. Sản xuất: source, bản dựng/thiết kế, phiên bản, phản hồi và trạng thái bàn giao.
3. Xuất bản: Facebook/TikTok, lịch dự kiến, kết quả thực tế, link và người ghi nhận.

Phản hồi phải gắn với bài/phiên bản. Brief gốc và caption cuối không nên ghi đè lên nhau. Video gợi ý Hook, Thoại, Cảnh quay, Caption; ảnh gợi ý thông điệp, hướng thiết kế và Caption. Gợi ý không tạo thêm trường bắt buộc và không tự cắt ô Excel.

Không đưa checklist quay chụp vào bài đăng. Đạo cụ/chuẩn bị chung thuộc buổi Shooting hoặc brief chu kỳ; bài chỉ tham chiếu khi cần.

## Quy trình bàn giao đề xuất

Các mốc kế hoạch chu kỳ và mốc từng bài khác nhau: khách duyệt hướng Content Plan không đồng nghĩa khách đã duyệt mọi bản dựng cuối.

| Bước | Người thao tác | Hành động | Dữ liệu tối thiểu |
|---|---|---|---|
| Lập bài/giao người | Account; quyền tạo của Content tùy cấu hình dự án | Tạo bài hoặc nhập Excel, giao Content/Media | Dự án, chu kỳ, tên, định dạng; chưa ép ngày đăng khi đang lên ý tưởng |
| Soạn nội dung | Content được giao | Tự lưu nháp; Gửi duyệt nội dung | Nội dung, người gửi, thời điểm, phiên bản |
| Duyệt nội dung | Account | Duyệt hoặc Yêu cầu sửa | Phản hồi bắt buộc khi trả sửa |
| Sản xuất | Media được giao | Nhận brief; gửi bản dựng/thiết kế | Link/file bản sản xuất và phiên bản |
| Duyệt bản cuối | Account; ghi nhận khách duyệt ngoài app ở V1 | Ghi nhận đã gửi, khách duyệt hoặc yêu cầu sửa | Bản được duyệt, ngày, người ghi nhận, phản hồi/bằng chứng |
| Lên lịch | Account | Ghi lịch dự kiến theo kênh | Kênh và ngày giờ; chưa gọi là đã đăng |
| Xác nhận đã đăng | Account | Ghi kết quả thực tế từng kênh | Ngày giờ thực tế, link hoặc lý do thiếu link |
| Hủy | Account | Hủy bài có lý do | Giữ nội dung/lịch sử; dừng nhắc việc, ghi bài thay thế nếu có |

Giao diện chỉ hiện hành động phù hợp với bước hiện tại, thay vì yêu cầu chọn tùy ý từ danh sách trạng thái dài. Lưu các trạng thái sản xuất, duyệt và xuất bản riêng; hiển thị một trạng thái tổng để dễ đọc.

Sửa nội dung/bản sản xuất đã duyệt tạo bản nháp mới và cần duyệt lại phần thay đổi; bản đã duyệt cũ vẫn được giữ. Thay lịch đăng ghi lịch sử thay đổi; không âm thầm đổi ngày cam kết để xóa trễ.

V1 chỉ quản lý/ghi nhận lịch và kết quả. App hiện chưa kết nối API đăng Facebook/TikTok; nút Lên lịch không hứa tự xuất bản.

## Phân quyền

Được cấp quyền dự án và được giao bài là hai điều kiện riêng. Giao người không tự cấp quyền vào dự án.

| Vai trò | Quyền đề xuất |
|---|---|
| Content/Creative | Xem dự án được cấp quyền; sửa nội dung bài được giao; gửi duyệt; đọc phản hồi. Không sửa công nợ/quyền dự án hoặc tự xác nhận khách duyệt |
| Media | Xem brief liên quan; cập nhật source/bản dựng, phản hồi và bàn giao bài được giao. Không tự đổi brief đã duyệt hoặc lịch cam kết |
| Account có quyền sửa | Tạo/nhập bài, giao người, duyệt, ghi nhận khách duyệt, điều chỉnh lịch có lý do, ghi nhận đăng/hủy |
| BODs | Theo dõi trong phạm vi quyền; xem tiến độ và lịch sử |
| Administrator | Quản lý quyền; quyền thao tác nghiệp vụ phải được cấu hình rõ, không mặc định đồng nghĩa quyền duyệt thay khách |

## Chuyển từ Excel

Giữ tám nhóm dữ liệu cũ. Phần ngày, người phụ trách và kênh là metadata nghiệp vụ, không bắt Content viết lại brief vào các trường mới.

Luồng nhập: chọn dự án/chu kỳ → chọn file/tab → tự nhận dòng tiêu đề → xem ghép cột → xem thay đổi → xác nhận nhập → mở danh sách đã nhập.

- Thêm cách dán vùng ô từ Excel/Sheets cho nhu cầu nhanh; bảo toàn xuống dòng trong ô. XLSX tiếp tục là luồng đầy đủ.
- Cột ngoài mẫu cần bước chọn: mục nội dung bổ sung hay metadata. Không tự coi “Ngày đăng”/“Người làm” là ô kịch bản.
- Mã bài ổn định dùng cập nhật; STT là thứ tự hiển thị. Không ghép bằng STT khi file đã sắp xếp lại.
- Bài đã duyệt nhập thay đổi vào nháp mới, không âm thầm thay bản được duyệt.
- Preview phải cho xem cũ → mới khi cập nhật. Sau nhập nêu số mới/cập nhật/bỏ qua/lỗi và có lịch sử đợt nhập để phục hồi trong phạm vi quyền.
- Tên mục đổi/ẩn và cấu hình riêng cần được bảo toàn khi xuất rồi nhập lại. Nội dung ẩn vẫn giữ; không làm mất dữ liệu.
- Chưa triển khai đồng bộ hai chiều Google Sheets ở V1: phải giải quyết xung đột bản app và sheet trước.

## Quy tắc dữ liệu cần chốt

- Mỗi bài thuộc một dự án và một chu kỳ; Content Plan và Bài đăng dùng cùng mã bài.
- Phân công lưu trên bài theo nhân sự ổn định; liên kết task theo mã bài và loại công việc. Chốt chu kỳ không làm mất tên người làm.
- Brief/sản xuất có phiên bản; sự kiện gửi/duyệt/trả sửa lưu người, thời điểm, nội dung và phiên bản.
- Mỗi lần xuất bản có kênh, lịch dự kiến, ngày thực tế, trạng thái và link riêng.
- Một bài đa kênh không tự tính thành hai bài định mức. Quy tắc hoàn tất là đủ kênh cam kết, hoặc quy tắc khác được xác nhận cho dự án.
- Bài hủy không tính như bài bàn giao; bài thay thế/bù liên kết bài gốc, không xóa lịch sử.
- Chu kỳ đã chốt không mở sửa sản xuất đại trà. Nếu cho bổ sung link/thông tin thực tế sau chốt, phải là thao tác riêng có quyền và lịch sử, không thay kết quả chốt âm thầm.
- Demo đang dùng ngày cố định 25/09/2026 để dữ liệu mẫu có ý nghĩa; khi vận hành thực cần ngày hiện tại và múi giờ thống nhất. Đây là giới hạn prototype, không thay ngày demo trong nghiên cứu.

## Thứ tự triển khai

1. P0 — độ tin cậy: phân công lưu lâu dài, quyền Content/Media, ghi ngày thực tế nhất quán, kết quả theo kênh.
2. P1 — hoàn thiện phối hợp: rà nhanh kế hoạch, hành động bàn giao, phản hồi/phiên bản, nhận diện người cần xử lý tiếp.
3. P1 — chuyển Excel: dán vùng ô, preview cũ/mới, phân loại cột bổ sung, phục hồi đợt nhập.
4. P2 — lịch tuần/tháng và link khách duyệt có kiểm soát. Chỉ thêm sau khi luồng chính đã kiểm thử.

## Kiểm thử với team trước khi chốt thiết kế

Đề xuất thử với Content, Media và Account; chưa thực hiện.

| Tình huống | Dấu hiệu đạt |
|---|---|
| Content nhập một kế hoạch từ sheet, mở và sửa một bài | Không viết lại brief; không mất xuống dòng; biết dữ liệu đã lưu và bài cần xử lý |
| Account rà cả chu kỳ | Nhận ra thiếu bài, lệch nhiệm vụ/định dạng, chưa giao người và lịch trống từ một danh sách |
| Media nhận một bài | Tìm đúng brief đã duyệt và bản cần sửa; biết ai nhận bàn giao tiếp |
| Khách yêu cầu sửa bản đã duyệt | Phản hồi gắn đúng phiên bản; bản cũ còn; dấu duyệt không áp dụng nhầm bản mới |
| Facebook đăng hôm nay, TikTok ngày mai | Ghi hai kết quả riêng; định mức không nhân đôi; đúng/trễ phản ánh lịch từng kênh |
| Account xem chu kỳ đã chốt sau khi task cũ bị dọn | Tên nhân sự, bản duyệt và link đăng vẫn còn |
| Nhân sự bị thu hồi quyền khi đang mở bài | Lần lưu bị chặn và phản hồi rõ; không lộ dữ liệu ngoài quyền |

Ghi lại số bước, thời gian tìm bài/brief, số lần quay lại Excel và lỗi bàn giao. Đặt mục tiêu sau lượt thử đầu, không tự công bố số liệu hiệu quả khi chưa đo.

## Cập nhật triển khai · 07/10/2026

Đã triển khai P0/P1 trên prototype: phân công lưu trong bài, Content/Media làm phần được giao với quyền sửa dự án, chi tiết dùng chung từ trang dự án/Bài đăng/Việc cần làm, bàn giao và duyệt thủ công có lịch sử bản gửi. Trả sửa tạo phiên bản mới; kênh đã đăng không bị xóa khi cập nhật kênh còn lại. Bài cũ giữ trạng thái, không tự tạo bằng chứng duyệt hoặc ngày thực tế.

Content Plan có danh sách rà nhanh và vùng viết dọc. Trang Bài đăng có nhóm việc nhanh, bộ lọc người, tự chọn chu kỳ hiện tại và xem chu kỳ đã chốt. Chu kỳ cũ chỉ có kết quả tổng được ghi rõ, không tự sinh chi tiết bài.

Excel hỗ trợ file hoặc dán vùng ô, ghép cột bổ sung thành nội dung/thông tin nghiệp vụ/bỏ qua, preview cũ/mới và lịch sử hoàn tác toàn đợt khi chưa sửa hoặc bàn giao tiếp. Xuất/nhập lại giữ mã bài, xuống dòng, tên mục, mục ẩn và mục bổ sung. Bản đã gửi duyệt phải tạo bản sửa trước khi nhập cập nhật.

Đã kiểm tra trên dữ liệu tách riêng: quyền xem/sửa/thu hồi, lịch sử phiên bản, xuất bản từng kênh, lịch dự kiến trước duyệt, phân công trước khi dọn task cũ, lưu/tải localStorage, nhập/xuất/hoàn tác Excel và các nghiệp vụ hợp đồng đang có. Preview thật đã rà bố cục, chọn chu kỳ và ghép dữ liệu dán; không lưu bài thử vào dữ liệu người dùng. Chưa thử với team CK Hub. P2 lịch tuần/tháng và link khách duyệt giữ cho bước sau.

## Điều chỉnh theo gói / chu kỳ · 07/10/2026

Theo lựa chọn của người dùng, bảng ngoài Bài đăng quản lý từng gói nội dung (một chu kỳ của dự án), thay danh sách mọi bài và hai chế độ Content Plan / Tiến độ. Lọc dự án được cấp quyền, trạng thái chu kỳ và gói cần xử lý; chu kỳ đang chạy đứng trước, chu kỳ đã chốt vẫn có trong danh sách.

Mở gói bằng dialog rộng: bảng năm cột gộp chủ đề/định dạng, ý tưởng, tên Content/Media, bước xử lý/hạn tiếp theo và ngày đăng dự kiến/thực tế. Tên bài, thể loại, định dạng và ý tưởng sửa ngay tại ô khi bài còn nháp và người dùng có quyền. Enter chuyển xuống cùng cột, Shift + Enter xuống dòng trong ý tưởng. Brief dài dùng vùng viết dọc có các mục tùy chỉnh. Phân công/duyệt/xuất bản vẫn qua chi tiết dùng chung; đóng chi tiết hoặc nhập Excel quay lại đúng gói và bộ lọc.

Định mức đọc từ gói dự án; chu kỳ đã chốt đọc số đã lưu trong kết quả. Bài tặng và bài hủy hiển thị riêng, bài hủy không lấp định mức. Chu kỳ cũ chỉ có số tổng không được tự tạo bài. Partner chỉ thấy bài được giao, không lấy số tổng của bài ngoài phạm vi làm số của mình.

Thêm/nhân bản bài nằm trong gói, chỉ Account có quyền sửa chu kỳ đang chạy của dự án đang hoạt động. Bản sao giữ nội dung/mục tùy chỉnh, tạo ID mới, xóa phân công, duyệt, hạn, lịch đăng và link sản xuất; vượt định mức được đánh dấu bài tặng theo nghiệp vụ hiện có. Thêm bài lưu vào đúng chu kỳ đang mở. Không đổi dữ liệu người dùng hay phiên bản localStorage.

Kiểm tra fixture: định mức, số chốt cũ, bài tặng/hủy, phạm vi Partner, quyền sửa ô khi thu hồi/gửi duyệt/chốt, bản sao sạch và lưu/tải lại. Preview kiểm tra Enter, phần viết dài, quay lại gói giữ bộ lọc, nhập Excel, toàn màn hình, chu kỳ cũ chỉ xem; bảng gói và dialog không tràn ngang ở desktop và màn hình 390px. Chưa thử với team CK Hub.
