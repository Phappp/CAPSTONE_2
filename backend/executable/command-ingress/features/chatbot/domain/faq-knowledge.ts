export interface FAQItem {
    id: string;
    category: 'policy' | 'payment' | 'technical' | 'certificate' | 'account';
    keywords: string[];
    question: string;
    answer: string;
    quickReplies?: Array<{ text: string; value: string }>;
}

export const FAQ_KNOWLEDGE: FAQItem[] = [
    // ===== POLICY =====
    {
        id: 'policy-refund',
        category: 'policy',
        keywords: ['hoàn tiền', 'hoàn phí', 'refund', 'trả lại tiền', 'bảo hành', 'không hài lòng'],
        question: 'Chính sách hoàn tiền như thế nào?',
        answer: `Mình chia sẻ chính sách hoàn tiền của nền tảng nhé:

📋 **Điều kiện hoàn tiền:**
- Yêu cầu hoàn tiền trong vòng **7 ngày** kể từ ngày đăng ký
- Áp dụng khi khóa học có lỗi kỹ thuật nghiêm trọng
- Hoàn tiền **100%** nếu yêu cầu trong 7 ngày và chưa học quá 30% nội dung

⏰ **Lưu ý:**
- Sau 7 ngày, không áp dụng hoàn tiền
- Đã học quá 30% nội dung = không được hoàn tiền

Bạn cần mình hỗ trợ yêu cầu hoàn tiền không?`,
        quickReplies: [
            { text: 'Yêu cầu hoàn tiền', value: 'tôi muốn hoàn tiền' },
            { text: 'Tìm khóa học khác', value: 'gợi ý khóa học' },
        ],
    },
    {
        id: 'policy-payment',
        category: 'policy',
        keywords: ['thanh toán', 'payment', 'chuyển khoản', 'visa', 'momo', 'zalo pay', 'napas'],
        question: 'Các phương thức thanh toán được chấp nhận?',
        answer: `Nền tảng hỗ trợ nhiều phương thức thanh toán:

💳 **Thanh toán trực tuyến:**
- Visa / Mastercard
- ATM nội địa (qua Napas)
- Momo, ZaloPay, VNPay
- Chuyển khoản ngân hàng

📱 **Thanh toán qua ví điện tử:**
- Momo
- ZaloPay
- VNPay

💡 **Lưu ý:**
- Thanh toán thành công sẽ truy cập khóa học ngay lập tức
- Hóa đơn sẽ được gửi qua email

Bạn muốn đăng ký khóa học nào không?`,
        quickReplies: [
            { text: 'Tìm khóa miễn phí', value: 'khóa miễn phí' },
            { text: 'Tìm khóa dưới 500k', value: 'khóa dưới 500k' },
        ],
    },
    {
        id: 'policy-access',
        category: 'policy',
        keywords: ['truy cập', 'access', 'hạn sử dụng', 'thời hạn', 'hết hạn', 'expires'],
        question: 'Khóa học có thời hạn không?',
        answer: `Thông tin về thời hạn khóa học:

⏰ **Khóa học miễn phí:**
- Truy cập **không giới hạn** thời gian
- Học mãi mãi khi đã đăng ký

💰 **Khóa học có phí:**
- Truy cập **1 năm** kể từ ngày đăng ký
- Có thể gia hạn với chi phí ưu đãi

🎓 **Khóa học Premium:**
- Truy cập **vĩnh viễn**
- Bao gồm cập nhật nội dung mới

📱 **Lưu ý:**
- Đã tải offline = có thể xem offline mà không cần internet
- Đăng nhập đồng thời tối đa 2 thiết bị

Bạn muốn tìm hiểu thêm về khóa học nào không?`,
        quickReplies: [
            { text: 'Tìm khóa Premium', value: 'khóa premium' },
            { text: 'Tìm khóa miễn phí', value: 'khóa miễn phí' },
        ],
    },
    {
        id: 'policy-group',
        category: 'policy',
        keywords: ['học nhóm', 'group', 'doanh nghiệp', 'team', 'corporate', 'tập thể', 'mua nhiều'],
        question: 'Có gói học nhóm / doanh nghiệp không?',
        answer: `Có chắc chắn! Nền tảng hỗ trợ gói học nhóm và doanh nghiệp:

👥 **Gói nhóm (3-10 người):**
- Giảm **20%** cho mỗi người
- Quản lý tiến độ học tập
- Báo cáo chi tiết

🏢 **Gói doanh nghiệp (10+ người):**
- Giảm **30-50%** tùy số lượng
- Dashboard quản lý riêng
- Tài khoản admin để theo dõi nhân viên
- Custom learning path
- Hỗ trợ 24/7

📞 **Liên hệ:**
- Email: enterprise@example.com
- Hotline: 1900-xxxx

Bạn muốn mình tư vấn gói phù hợp không?`,
        quickReplies: [
            { text: 'Liên hệ tư vấn', value: 'tôi muốn tư vấn gói doanh nghiệp' },
            { text: 'Tìm khóa cho cá nhân', value: 'gợi ý khóa học' },
        ],
    },

    // ===== PAYMENT =====
    {
        id: 'payment-methods',
        category: 'payment',
        keywords: ['thanh toán', 'mua', 'order', 'đơn hàng', 'giỏ hàng', 'cart'],
        question: 'Làm sao để thanh toán khóa học?',
        answer: `Các bước thanh toán khóa học:

1️⃣ **Chọn khóa học** bạn muốn đăng ký
2️⃣ Nhấn **"Đăng ký"** hoặc **"Mua ngay"**
3️⃣ Chọn **phương thức thanh toán** (Visa, Momo, ATM...)
4️⃣ Hoàn tất thanh toán
5️⃣ Nhận **email xác nhận** và bắt đầu học ngay!

💡 **Mẹo:**
- Thanh toán thành công = truy cập khóa học **ngay lập tức**
- Khóa miễn phí = không cần thanh toán

Bạn muốn tìm khóa học nào không?`,
        quickReplies: [
            { text: 'Tìm khóa miễn phí', value: 'khóa miễn phí' },
            { text: 'Xem khóa phổ biến', value: 'khóa phổ biến' },
        ],
    },
    {
        id: 'payment-voucher',
        category: 'payment',
        keywords: ['mã giảm giá', 'voucher', 'coupon', 'khuyến mãi', 'promo', 'discount', 'code'],
        question: 'Làm sao sử dụng mã giảm giá?',
        answer: `Cách sử dụng mã giảm giá / voucher:

1️⃣ Chọn khóa học muốn đăng ký
2️⃣ Nhấn **"Thanh toán"**
3️⃣ Tại mục **"Mã giảm giá"**, nhập code của bạn
4️⃣ Nhấn **"Áp dụng"** để xem giá đã giảm
5️⃣ Hoàn tất thanh toán với giá mới!

📋 **Lưu ý:**
- Mỗi mã chỉ sử dụng được **1 lần**
- Một số mã chỉ áp dụng cho khóa học nhất định
- Mã có thể có hạn sử dụng

Bạn có mã voucher chưa? Mình có thể giúp bạn tìm khóa học phù hợp!`,
        quickReplies: [
            { text: 'Tìm khóa Java', value: 'khóa java' },
            { text: 'Tìm khóa Python', value: 'khóa python' },
        ],
    },
    {
        id: 'payment-invoice',
        category: 'payment',
        keywords: ['hóa đơn', 'invoice', 'bill', 'xuất hóa đơn', 'VAT', 'tax'],
        question: 'Làm sao để xuất hóa đơn VAT?',
        answer: `Hướng dẫn xuất hóa đơn VAT:

📧 **Cách 1: Qua email**
- Sau khi thanh toán, reply email xác nhận với thông tin:
  - Tên công ty
  - Địa chỉ
  - Mã số thuế
  - Email nhận hóa đơn

📱 **Cách 2: Trong tài khoản**
- Vào **"Đơn hàng của tôi"**
- Chọn đơn cần xuất hóa đơn
- Điền thông tin xuất hóa đơn
- Hóa đơn sẽ được gửi trong **24-48h**

⏰ **Lưu ý:**
- Yêu cầu xuất hóa đơn trong vòng **7 ngày** sau thanh toán

Bạn cần mình hỗ trợ gì thêm không?`,
        quickReplies: [
            { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
            { text: 'Xem đơn hàng', value: 'đơn hàng của tôi' },
        ],
    },

    // ===== TECHNICAL =====
    {
        id: 'tech-mobile',
        category: 'technical',
        keywords: ['app', 'mobile', 'điện thoại', 'điện thoại', 'ios', 'android', 'smartphone'],
        question: 'Có app di động không?',
        answer: `Có app di động cho bạn học mọi lúc mọi nơi!

📱 **Tải app:**
- **iOS**: Tìm "eLearning" trên App Store
- **Android**: Tìm "eLearning" trên Google Play

✨ **Tính năng app:**
- Học offline - tải bài giảng xuống xem không cần internet
- Thông báo nhắc học hàng ngày
- Đồng bộ tiến độ với website
- Giao diện tối (dark mode)
- Phát video chất lượng cao

📊 **Cập nhật:**
- App được cập nhật thường xuyên với tính năng mới

Bạn dùng iOS hay Android?`,
        quickReplies: [
            { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
            { text: 'Tính năng app', value: 'app có gì hay' },
        ],
    },
    {
        id: 'tech-offline',
        category: 'technical',
        keywords: ['offline', 'tải về', 'download', 'không internet', 'mạng', 'wifi'],
        question: 'Có học offline được không?',
        answer: `Có chắc! Bạn có thể học offline bất cứ lúc nào:

📥 **Cách tải bài học:**
1. Mở khóa học đã đăng ký
2. Chọn **bài giảng muốn tải**
3. Nhấn nút **"Tải xuống"**
4. Chọn chất lượng (SD/HD)
5. Bài giảng sẽ có trong **"Đã tải"**

💾 **Lưu ý:**
- Video tải về có thể xem **không cần internet**
- File được lưu trong app, không chiếm bộ nhớ điện thoại quá nhiều
- Nên kết nối wifi để tải nhanh hơn

⚠️ **Giới hạn:**
- Một số khóa học có giới hạn thời gian tải

Bạn muốn tải khóa học nào?`,
        quickReplies: [
            { text: 'Tìm khóa Python', value: 'khóa python' },
            { text: 'Khóa miễn phí', value: 'khóa miễn phí' },
        ],
    },
    {
        id: 'tech-certificate-download',
        category: 'technical',
        keywords: ['tải chứng chỉ', 'download certificate', 'lưu chứng chỉ', 'pdf'],
        question: 'Làm sao tải chứng chỉ hoàn thành?',
        answer: `Cách tải chứng chỉ hoàn thành khóa học:

📜 **Điều kiện nhận chứng chỉ:**
- Hoàn thành **100%** nội dung khóa học
- Vượt qua bài thi cuối khóa (nếu có)

📥 **Các bước tải:**
1. Vào **"Khóa học của tôi"**
2. Chọn khóa đã hoàn thành
3. Nhấn **"Nhận chứng chỉ"**
4. Điền thông tin (tên, ngày sinh)
5. Nhấn **"Tải PDF"** hoặc **"Chia sẻ"**

🎨 **Chứng chỉ bao gồm:**
- Tên khóa học
- Họ tên học viên
- Ngày hoàn thành
- Mã xác thực QR
- Logo nền tảng

Bạn đã hoàn thành khóa nào chưa?`,
        quickReplies: [
            { text: 'Xem khóa đã đăng ký', value: 'khóa của tôi' },
            { text: 'Tìm khóa mới', value: 'gợi ý khóa học' },
        ],
    },
    {
        id: 'tech-error',
        category: 'technical',
        keywords: ['lỗi', 'error', 'bug', 'không xem được', 'video lỗi', 'bị stuck', 'treo'],
        question: 'Gặp lỗi khi học, phải làm sao?',
        answer: `Mình giúp bạn xử lý lỗi thường gặp:

🔧 **Các lỗi phổ biến và cách fix:**

**Video không load được:**
- Tải lại trang / thoát app và vào lại
- Xóa cache trình duyệt
- Thử dùng trình duyệt khác

** Âm thanh bị mất:**
- Kiểm tra loa/headphone
- Tắt và bật lại video

**Không đăng nhập được:**
- Reset password qua email
- Kiểm tra kết nối internet

**App bị crash:**
- Cập nhật app lên phiên bản mới nhất
- Xóa cache app

📞 **Hỗ trợ nếu lỗi vẫn tiếp tục:**
- Email: support@example.com
- Chat trực tiếp với đội ngũ

Bạn gặp lỗi gì cụ thể?`,
        quickReplies: [
            { text: 'Reset mật khẩu', value: 'quên mật khẩu' },
            { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
        ],
    },

    // ===== CERTIFICATE =====
    {
        id: 'cert-valid',
        category: 'certificate',
        keywords: ['chứng chỉ', 'certificate', 'chứng nhận', 'cert', 'giá trị', 'xác nhận'],
        question: 'Chứng chỉ có giá trị không?',
        answer: `Chứng chỉ của nền tảng có giá trị thực tế:

🎓 **Giá trị của chứng chỉ:**
- Xác nhận bạn đã hoàn thành khóa học
- Được **công nhận bởi nhiều doanh nghiệp** trong ngành
- Có **mã QR** để nhà tuyển dụng xác minh
- Có thể **share lên LinkedIn**

📋 **Yêu cầu nhận chứng chỉ:**
- Hoàn thành 100% nội dung
- Vượt qua bài kiểm tra cuối khóa (nếu có)

🌍 **Chứng chỉ quốc tế:**
- Một số khóa học cung cấp chứng chỉ từ đối tác quốc tế
- Có giá trị toàn cầu

💼 **Sử dụng:**
- Thêm vào CV / Portfolio
- Chia sẻ trên LinkedIn
- Xuất trình khi phỏng vấn

Bạn muốn tìm khóa có chứng chỉ không?`,
        quickReplies: [
            { text: 'Tìm khóa có certificate', value: 'khóa có chứng chỉ' },
            { text: 'Tìm khóa miễn phí', value: 'khóa miễn phí' },
        ],
    },
    {
        id: 'cert-verify',
        category: 'certificate',
        keywords: ['xác minh', 'verify', 'kiểm tra', 'check certificate', 'mã số', 'serial'],
        question: 'Làm sao để xác minh chứng chỉ?',
        answer: `Có 3 cách xác minh chứng chỉ:

🔍 **Cách 1: QR Code**
- Mỗi chứng chỉ có QR code ở góc dưới
- Nhà tuyển dụng quét QR = xem thông tin online

🔗 **Cách 2: Link trực tiếp**
- Truy cập verify.example.com/[mã-số]
- Nhập mã chứng chỉ để xem chi tiết

📧 **Cách 3: Liên hệ hỗ trợ**
- Email kèm mã chứng chỉ
- Đội ngũ sẽ xác minh trong 24h

✅ **Thông tin trên chứng chỉ:**
- Họ tên học viên
- Tên khóa học
- Ngày cấp
- Mã xác minh duy nhất
- Logo & đóng dấu nền tảng

Bạn muốn tìm hiểu thêm về khóa học nào không?`,
        quickReplies: [
            { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
            { text: 'Xem khóa của tôi', value: 'khóa của tôi' },
        ],
    },

    // ===== ACCOUNT =====
    {
        id: 'account-forgot',
        category: 'account',
        keywords: ['quên mật khẩu', 'forgot password', 'reset password', 'đặt lại mật khẩu'],
        question: 'Quên mật khẩu thì làm sao?',
        answer: `Cách đặt lại mật khẩu:

🔑 **Các bước:**
1. Tại trang đăng nhập, nhấn **"Quên mật khẩu"**
2. Nhập **email** đã đăng ký
3. Kiểm tra **hộp thư** (spam folder)
4. Nhấn link trong email để đặt mật khẩu mới
5. Đăng nhập với mật khẩu mới

📧 **Lưu ý:**
- Link có hiệu lực trong **24 giờ**
- Kiểm tra cả Spam/Junk folder
- Email gửi từ: noreply@example.com

📞 **Nếu không nhận được email:**
- Thử lại sau 5-10 phút
- Liên hệ hỗ trợ: support@example.com

🔒 **Bảo mật:**
- Mật khẩu mới phải có ít nhất 8 ký tự
- Nên kết hợp chữ hoa, số và ký tự đặc biệt

Bạn cần mình giúp gì thêm không?`,
        quickReplies: [
            { text: 'Đăng ký tài khoản', value: 'đăng ký' },
            { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
        ],
    },
    {
        id: 'account-change-email',
        category: 'account',
        keywords: ['đổi email', 'change email', 'cập nhật email', 'sửa email'],
        question: 'Làm sao đổi email đăng ký?',
        answer: `Cách thay đổi email tài khoản:

📧 **Các bước:**
1. Đăng nhập → Vào **"Cài đặt tài khoản"**
2. Chọn **"Thông tin cá nhân"**
3. Nhấn **"Thay đổi email"**
4. Nhập email mới
5. Xác minh qua **email mới**
6. Email cũ sẽ nhận thông báo thay đổi

⚠️ **Lưu ý:**
- Email mới phải chưa được đăng ký
- Khóa học và tiến độ vẫn giữ nguyên
- Email cũ vẫn nhận được thông báo trong 30 ngày

🔒 **Bảo mật:**
- Có thể cần xác minh mật khẩu
- Không thể đổi quá 2 lần/tháng

Bạn cần mình tư vấn khóa học nào không?`,
        quickReplies: [
            { text: 'Tìm khóa học', value: 'gợi ý khóa học' },
            { text: 'Xem khóa của tôi', value: 'khóa của tôi' },
        ],
    },
];

// Helper function to find FAQ by message
export function findFAQByMessage(message: string): FAQItem | null {
    const lowerMessage = message.toLowerCase();

    // Score each FAQ by matching keywords
    let bestMatch: FAQItem | null = null;
    let bestScore = 0;

    for (const faq of FAQ_KNOWLEDGE) {
        let score = 0;
        for (const keyword of faq.keywords) {
            if (lowerMessage.includes(keyword.toLowerCase())) {
                score += keyword.length; // Longer keyword = higher priority
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = faq;
        }
    }

    // Minimum threshold to avoid false positives
    return bestScore >= 3 ? bestMatch : null;
}

// Get FAQ by category
export function getFAQsByCategory(category: FAQItem['category']): FAQItem[] {
    return FAQ_KNOWLEDGE.filter(faq => faq.category === category);
}

// Get all FAQ categories
export function getFAQCategories(): FAQItem['category'][] {
    return ['policy', 'payment', 'technical', 'certificate', 'account'];
}
