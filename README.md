# Hendy Tools Platform & App Downloader — Production Suite

Nền tảng chính thức phát hành phần mềm đa nền tảng **Hendy Tools** (Windows, Android, iOS) cùng bộ công cụ quản trị máy chủ **Hendy Server Studio**, hệ thống đóng gói nhị phân tự động và tích hợp **Google Drive Workspace API**.

---

## 🏗️ Kiến Trúc Hệ Thống (Architecture)

1. **Thực thể A: Hendy Tools Distribution Portal**
   - Phân phối chính thức bản phát hành **Hendy Tools Pro v3.1.2** (Windows x64 Setup `.exe`), Android Mobile (APK), và Apple iOS (TestFlight / Enterprise).
   - Kiểm tra mã băm **SHA-256 Authenticode EV** bảo chứng tính nguyên bản 100%.

2. **Thực thể B: Cửa Hàng Ứng Dụng (Multi-App Downloader & Store)**
   - Kho ứng dụng: **Hendy Tools Pro**, **HyperTerminal Pro**, **OmniCanvas Studio**, **VaultKey Enterprise**.
   - Chạy thử WebAssembly trực tiếp trên trình duyệt không cần quyền Admin (`WebSandboxModal`).
   - Tệp manifest chuẩn hóa byte checksum `manifest.json`.

3. **Thực thể C: Bảng Quản Trị Máy Chủ (Hendy Server Admin Panel Plus)**
   - Giám sát phần cứng: CPU, RAM, ổ cứng SSD NVMe, lưu lượng Cloudflare R2 thời gian thực.
   - Quản trị dịch vụ máy chủ, tiến trình đang chạy, cổng mạng TCP/UDP và Web CLI Terminal.
   - Xuất / Nhập bản sao lưu cấu hình toàn bộ hệ thống (`System Snapshot JSON`).

4. **Thực thể D: Studio & Pipeline Đóng Gói Nhị Phân**
   - Trình duyệt và chỉnh sửa mã nguồn cốt lõi (Rust + Tauri, C++, Go, Wasm).
   - Đóng gói đa nền tảng: `.exe`, `.msi`, `.dmg`, `.pkg`, `.AppImage`, `.deb`, `.apk`, `.wasm` qua JSZip.
   - Quét mã độc SAST, quản lý chứng chỉ ký số trong két an toàn.

5. **Tích hợp Google Drive Cloud Hub (Google Workspace API)**
   - Đăng nhập bảo mật Google với Google Brand Button.
   - Sao lưu tức thời cấu hình hệ thống, snapshot và manifest lên Google Drive cá nhân.
   - Lưu trữ trực tiếp các tệp nhị phân đã build sang Drive với liên kết xem và tải tức thì.

---

## 🚀 Triển Khai Lên Cloudflare Workers & Pages Qua GitHub

### 1. Chuẩn Bị Kho Lưu Trữ GitHub
```bash
git init
git add .
git commit -m "feat: Hendy Tools Platform & App Downloader production release"
git branch -M main
git remote add origin https://github.com/hendyngo-servers/HendyToolsPlatform.git
git push -u origin main --force
```

### 2. Cấu Hình Tự Động Triển Khai (CI/CD GitHub Actions)
Dự án đã tích hợp sẵn 4 luồng GitHub Actions trong `.github/workflows/`:
- **`ci-deploy.yml`**: Kiểm tra TypeScript (`tsc --noEmit`), chạy 20 bài kiểm thử đơn vị (`node:test`), build và triển khai tự động lên Cloudflare Pages.
- **`deploy-cloudflare.yml`**: Triển khai trực tiếp frontend và Pages Functions lên Cloudflare Pages bằng `wrangler-action`.
- **`build-and-publish-release.yml`**: Ma trận build tự động cho Windows, macOS, Linux và Android.
- **`deploy-render.yml`**: Tự động kích hoạt deploy trên Render.com Web Service khi có push mới.

### 3. Cấu Hình Secret Trên GitHub
Vào **Settings → Secrets and variables → Actions** trên repository GitHub của bạn và thêm:
- `CLOUDFLARE_API_TOKEN`: Token tài khoản Cloudflare có quyền chỉnh sửa Pages và Workers.
- `CLOUDFLARE_ACCOUNT_ID`: Mã định danh Account ID trên Cloudflare Dashboard.
- `RENDER_DEPLOY_HOOK_URL`: (Tùy chọn) Webhook URL của dịch vụ Render.com.

### 4. Triển Khai Thủ Công Bằng Wrangler CLI (Nếu cần)
```bash
# Đăng nhập Cloudflare
npx wrangler login

# Build sản phẩm
npm run build

# Triển khai lên Cloudflare Pages
npx wrangler pages deploy dist --project-name=hendy-tools-platform --branch=main
```

---

## 💻 Chạy Thử Nghiệm Tại Môi Trường Cục Bộ (Local Development)

```bash
# Cài đặt thư viện
npm install

# Khởi chạy máy chủ phát triển (Express + Vite HMR trên cổng 3000)
npm run dev

# Chạy kiểm thử đơn vị
npx tsx --test src/utils/manifest.test.ts src/utils/packaging.test.ts src/utils/workersPagesConfig.test.ts

# Kiểm tra cú pháp và loại dữ liệu
npm run lint

# Đóng gói xuất xưởng
npm run build
```
