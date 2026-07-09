# 💰 SpendAI - Quản Lý Chi Tiêu Thông Minh

![SpendAI](https://img.shields.io/badge/SpendAI-v1.0-7c3aed?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

Ứng dụng web quản lý chi tiêu cá nhân thông minh, tích hợp **AI** để phân tích và đưa ra gợi ý. Chạy trực tiếp trên trình duyệt Chrome, không cần cài đặt.

## ✨ Tính năng nổi bật

### 🤖 AI Thông Minh
- **Nhập bằng ngôn ngữ tự nhiên**: Gõ `ăn phở 50k` → AI tự động nhận diện: Ăn uống, 50,000₫
- **Tự động phân loại**: AI gợi ý danh mục dựa trên mô tả
- **Chatbot tài chính**: Hỏi đáp trực tiếp về thói quen chi tiêu
- **Phân tích chi tiêu**: Nhận xét, lời khuyên tiết kiệm
- **Tích hợp Google Gemini API** (tùy chọn, app vẫn hoạt động mà không cần API key)

### 📊 Quản lý chi tiêu
- Thêm / sửa / xóa giao dịch (chi tiêu & thu nhập)
- 8 danh mục chi tiêu + 1 danh mục thu nhập
- Dashboard tổng quan với biểu đồ tròn, cột, đường
- Lịch sử giao dịch với tìm kiếm, lọc, phân trang
- Ngân sách theo tháng & theo danh mục
- Xuất dữ liệu JSON/CSV, nhập backup

### 🎨 Giao diện
- Dark mode premium với glassmorphism
- Gradient tím-xanh sang trọng
- Micro-animations mượt mà
- Responsive (hỗ trợ mobile)
- Hoàn toàn bằng **Tiếng Việt** 🇻🇳

## 🚀 Cách sử dụng

### Cách 1: Mở trực tiếp
1. Clone hoặc download repo
2. Mở file `index.html` bằng Chrome
3. Done! ✅

### Cách 2: Local server (khuyên dùng)
```bash
# Clone repo
git clone https://github.com/tung25112008/qu-n-l-chi-ti-u-b-ng-ai.git
cd qu-n-l-chi-ti-u-b-ng-ai

# Chạy server
python -m http.server 8080
# hoặc
npx serve . -l 8080
```
Mở Chrome → `http://localhost:8080`

## 🤖 Cấu hình AI (Tùy chọn)

App hoạt động tốt **mà không cần API key** nhờ hệ thống AI rule-based. Nếu muốn AI thông minh hơn:

1. Lấy API key miễn phí tại [Google AI Studio](https://aistudio.google.com/apikey)
2. Mở app → **Cài đặt** → Nhập API key
3. Bây giờ chatbot và phân tích sẽ dùng Gemini AI!

## 📁 Cấu trúc dự án

```
expense-tracker-ai/
├── index.html          # Trang chính (SPA)
├── README.md           # File này
├── css/
│   └── style.css       # Dark mode, glassmorphism, responsive
└── js/
    ├── app.js          # Main logic, navigation, rendering
    ├── storage.js      # localStorage CRUD, export/import
    ├── charts.js       # Chart.js visualizations
    ├── ai.js           # NLP parser, Gemini API, chatbot
    └── utils.js        # Helpers, categories, formatting
```

## 🛠️ Tech Stack

| Công nghệ | Mục đích |
|-----------|---------|
| HTML5 | Cấu trúc SPA |
| CSS3 | Dark mode, glassmorphism, animations |
| Vanilla JS | Logic ứng dụng |
| Chart.js 4 | Biểu đồ (CDN) |
| Google Gemini API | AI chatbot & phân tích |
| localStorage | Lưu trữ dữ liệu |

## 📸 Screenshots

### Dashboard
- Tổng quan chi tiêu với 4 stat cards
- Biểu đồ tròn theo danh mục
- Biểu đồ cột 7 ngày gần nhất
- Xu hướng 6 tháng

### Nhập bằng AI
- Gõ `grab đi làm 25 nghìn` → AI phân tích tự động
- Hoặc nhập thủ công qua form

### AI Chatbot
- Hỏi: "Tháng này chi bao nhiêu?"
- Hỏi: "Phân tích chi tiêu"
- Hỏi: "Gợi ý tiết kiệm"

## 📝 License

MIT License - Tự do sử dụng và chỉnh sửa.

---

Made with 💜 by SpendAI Team
