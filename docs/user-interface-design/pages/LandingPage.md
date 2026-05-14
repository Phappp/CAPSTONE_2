# LandingPage — UI Specification

**Source:** `frontend/src/pages/LandingPage.tsx`
**Route:** `/`
**Purpose:** Public marketing landing page introducing the MindBridge platform, with anchored navigation, animated sections (hero, stats, features, journey, testimonials, pricing, FAQ, CTA, footer) and entry points to register/login.

## Overview

The page is a single-route public homepage composed of a sticky `site-header`, a `hero-section`, a numeric `stats-strip`, content sections (`features`, `journey`, `testimonials`, `pricing`, `faq`), a final CTA card, and a `site-footer`. State is driven by three `IntersectionObserver` instances: `activeSection` highlights the matched nav link, `visibleRevealIds` toggles a `visible` CSS class on `data-reveal-id` elements for reveal animation, and `statsReady` triggers an eased `requestAnimationFrame` counter that animates `statValues` (`learners`, `courses`, `hours`, `rating`) toward their targets. Anchor links jump to `#section-*` ids; `Link` components route to `/register` and `/login`. Vietnamese marketing copy is rendered verbatim throughout.

## Interface Element Table

| ID  | Condition  | Control Type | Target | Description |
| :-- | :--------- | :----------- | :----- | :---------- |
| 1   | View       | Image        | Header Logo | `transLogo` wrapped by `Link to="/"`; alt text `"MindBridge Logo"`. |
| 2   | View       | Link         | Nav Link "Trang chủ" | Anchor to `#section-hero`; receives `active` class when `activeSection === "section-hero"`. |
| 3   | View       | Link         | Nav Link "Tính năng" | Anchor to `#section-features`; active state mirrors observer state. |
| 4   | View       | Link         | Nav Link "Lộ trình" | Anchor to `#section-journey`. |
| 5   | View       | Link         | Nav Link "Gói học" | Anchor to `#section-pricing`. |
| 6   | View       | Link         | Nav Link "FAQ" | Anchor to `#section-faq`. |
| 7   | View       | Link         | Header Login Link | `Link to="/login"` rendered as text `"Đăng nhập"`. |
| 8   | View       | Link         | Header Register Button | `Link to="/register"` styled `btn btn-primary btn-sm` labeled `"Bắt đầu"`. |
| 9   | View       | Badge        | Hero Badge | Sparkles icon + caption `"NỀN TẢNG HỌC TẬP THÔNG MINH"`. |
| 10  | View       | Heading      | Hero Title | `"Nâng cấp trải nghiệm học tập với AI và lộ trình cá nhân hóa"` with `<span class="text-highlight">AI</span>`. |
| 11  | View       | Text         | Hero Subtitle | Paragraph: `"MindBridge kết nối học viên, giảng viên và quản trị..."`. |
| 12  | Click      | Link         | Hero CTA Register | `Link to="/register"` labeled `"Tạo tài khoản"` with ArrowRight icon. |
| 13  | Click      | Link         | Hero CTA Journey | Anchor to `#section-journey` labeled `"Xem lộ trình học"`. |
| 14  | View       | Container    | Hero Metrics Row | Three metric cards: `"98%" / "Tỷ lệ hoàn thành khóa học"`, `"24/7" / "Hỗ trợ học tập liên tục"`, `"10k+" / "Lượt học mỗi ngày"`. |
| 15  | View       | Card         | Hero Visual Main Card | Three metrics: `"Lộ trình AI"`, `"Phân tích thời gian thực"`, `"Bảo mật và phân quyền"` with descriptions. |
| 16  | View       | Card         | Hero Float Card | CirclePlay icon + `"Xem demo 2 phút"`. |
| 17  | Loading    | Text         | Animated Stat: Learners | Eased counter `statValues.learners.toLocaleString("en-US")+"+"` toward target `45000`; label `"Học viên đang hoạt động"`. |
| 18  | Loading    | Text         | Animated Stat: Courses | Counter toward `1200`; label `"Khóa học chuyên sâu"`. |
| 19  | Loading    | Text         | Animated Stat: Hours | `(statValues.hours / 1000000).toFixed(1)+"M giờ"` toward `3200000`; label `"Thời lượng học đã hoàn thành"`. |
| 20  | Loading    | Text         | Animated Stat: Rating | `(statValues.rating / 10).toFixed(1)+"/5"` toward `49`; label `"Đánh giá trải nghiệm nền tảng"`. |
| 21  | View       | Heading      | Features Section Title | Kicker `"Tính năng nổi bật"`, h2 `"Được thiết kế để học nhanh hơn và dạy hiệu quả hơn"`. |
| 22  | View       | Card         | Feature Card x6 | Cards: `"Lộ trình học cá nhân hóa"`, `"Kho học liệu tập trung"`, `"AI hỗ trợ giảng dạy"`, `"Quản trị học phần linh hoạt"`, `"Đánh giá theo năng lực"`, `"Vận hành tối ưu hiệu suất"` with paragraph descriptions and lucide icons. |
| 23  | View       | Heading      | Journey Section Title | Kicker `"Lộ trình trải nghiệm"`, h2 `"Từ đăng ký đến hoàn thành khóa học chỉ với 4 bước"`. |
| 24  | View       | Card         | Journey Step x4 | Steps 01–04 with titles: `"Tạo tài khoản theo vai trò"`, `"Chọn khóa học và mục tiêu"`, `"Học và làm bài có phản hồi"`, `"Tổng kết và tối ưu tiếp theo"`. |
| 25  | View       | Heading      | Testimonials Title | Kicker `"Phản hồi người dùng"`, h2 `"Được tin dùng bởi cả học viên lẫn giảng viên"`. |
| 26  | View       | Card         | Testimonial Card x3 | Each renders five Star icons, a quoted Vietnamese paragraph, and an attribution (`"Ngọc Anh - Sinh viên CNTT"`, `"Thầy Minh - Giảng viên Data"`, `"Hà Phương - Quản trị học tập"`). |
| 27  | View       | Heading      | Pricing Title | Kicker `"Gói sử dụng"`, h2 `"Linh hoạt từ cá nhân đến tổ chức"`. |
| 28  | View       | Card         | Pricing Card "Starter" | Price `"Miễn phí"`; bullet list with CheckCircle2; primary action `Link to="/register"` `"Dùng ngay"`. |
| 29  | View       | Card         | Pricing Card "Pro Learning" | Price `"299K / tháng"`; featured variant; CTA `Link to="/register"` `"Bắt đầu Pro"`. |
| 30  | View       | Card         | Pricing Card "Campus" | Price `"Liên hệ"`; CTA `Link to="/register"` `"Tư vấn triển khai"`. |
| 31  | View       | Heading      | FAQ Title | Kicker `"Câu hỏi thường gặp"`, h2 `"Giải đáp nhanh trước khi bạn bắt đầu"`. |
| 32  | View       | Card         | FAQ Item x4 | Questions: `"MindBridge phù hợp với ai?"`, `"Tôi có thể dùng miễn phí không?"`, `"Dữ liệu học tập có an toàn không?"`, `"Có hỗ trợ cho giảng viên tạo đề không?"`. |
| 33  | View       | Card         | Final CTA Card | h2 `"Sẵn sàng bứt tốc hành trình học tập?"` with paragraph and two `Link` buttons: `"Tạo tài khoản ngay"` → `/register`, `"Tôi đã có tài khoản"` → `/login`. |
| 34  | View       | Image        | Footer Logo | `transLogo` with alt `"MindBridge Logo"` and copyright `"© 2026 MindBridge Co. All rights reserved."`. |
| 35  | View       | List         | Footer Platform Links | Anchors: `"Tính năng"` → `#section-features`, `"Gói sử dụng"` → `#section-pricing`, `"FAQ"` → `#section-faq`. |
| 36  | View       | List         | Footer Account Links | `Link` items: `"Đăng ký"` → `/register`, `"Đăng nhập"` → `/login`, `"Quên mật khẩu"` → `/forgot-password`. |
| 37  | View       | Icon         | Footer Social Icons | BookOpenText and GraduationCap icons; trailing note `"Học tập hiệu quả - cá nhân hóa - bảo mật."`. |

## States & Validation Notes

- `activeSection` is updated via an `IntersectionObserver` over `NAV_SECTIONS` ids with thresholds `[0.2, 0.35, 0.5, 0.7]` and rootMargin `"-80px 0px -45% 0px"`; the most-visible entry wins.
- Sections decorated with `data-reveal-id` receive the `visible` class when intersecting at threshold `0.16`; each id is unobserved after first reveal.
- `statsReady` flips to `true` when `#section-stats` reaches 0.35 visibility; this kicks off a 1400 ms cubic-eased animation that updates `statValues` via `requestAnimationFrame`.
- All visible labels are Vietnamese marketing copy preserved verbatim; English-locale digit formatting is used for `learners` and `courses` via `toLocaleString("en-US")`.
- No form submission, validation, or authenticated state exists on this route; all CTAs are pure navigation links.
