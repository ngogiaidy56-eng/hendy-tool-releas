# Hendy Tools — Three Cloudflare Pages + Worker API

Hendy Tools is split into three independent Cloudflare Pages applications: public web-user, Access-protected web-admin, and an Access-protected Operations Center. A Cloudflare Worker remains the API/control backend, and R2 stores real release artifacts. Each Pages application has its own HTML entrypoint and independent JavaScript/CSS bundle.

## Deployment topology

| Component | URL | Access |
|---|---|---|
| Web User | https://hendy-web-user.pages.dev | Public |
| Web Admin | https://hendy-web-admin.pages.dev | Cloudflare Access + email allow-list |
| Operations Center | https://hendy-operations.pages.dev | Cloudflare Access + email allow-list |
| Backend Worker | https://hendy-tool-releas.ngogiaidy56.workers.dev | Public endpoints as appropriate; Admin APIs verify Access JWT |
| GitHub source | https://github.com/ngogiaidy56-eng/hendy-tool-releas | GitHub Actions |

The Operations Center displays non-secret runtime status and links to source control, build/deploy workflows and Cloudflare Dashboard. It is not a replacement for GitHub or Cloudflare authorization and never embeds secrets in browser code.

## Separate build outputs

Run locally:

```bash
npm install
npm run lint
npm test
npm run build
node scripts/verify-store-admin-build.mjs
npm run build:pages
npm run build:pages:functions
npm run verify:pages
```

Build output folders:
- `dist-pages/web-user/` — public storefront.
- `dist-pages/web-admin/` — independent Admin Console.
- `dist-pages/operations/` — central operations dashboard.

Each folder contains its own `index.html`, assets, and Pages Functions gateway. Build output is generated during CI and is not committed.

## Required GitHub Actions settings

Open GitHub → Settings → Secrets and variables → Actions and configure:

| Name | Type | Purpose |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Secret | Scoped Cloudflare token with Workers Scripts, Pages, R2 and Access permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Variable or Secret | 32-character Cloudflare Account ID |
| `CF_ACCESS_ADMIN_EMAILS` | Variable or Secret | Real administrator email addresses, comma-separated |
| `RELEASE_PUBLISH_TOKEN` | Optional Secret | Stable CI publisher token; generated if omitted |

Do not commit API tokens, private keys, `.dev.vars`, or runtime secrets. Never expose secrets as `VITE_*` variables.

## Automated deployment

Workflow: `.github/workflows/deploy-cloudflare.yml`. It runs on matching pushes to `main` and can be started manually via **Actions → Deploy Hendy Store to Cloudflare Workers and 3 Pages → Run workflow**.

The workflow validates TypeScript/tests, builds the Worker and three independent Pages bundles, provisions the R2 bucket and Pages projects, creates Cloudflare Access apps, deploys the Worker and all three Pages, then runs live smoke tests. It fails if required credentials are missing, runtime readiness is incomplete, the public catalog is unavailable, or the Admin/Operations Access gates are not active.

Cloudflare account ID, API token and allowed admin emails must be provided by the repository owner. The workflow cannot create access to an account without these credentials. If Actions fails before any step starts because no runner was assigned, inspect GitHub Settings → Actions → General and hosted-runner availability.

## Admin and API security

Requests to `/api/*` on Pages are forwarded to the Worker. The Admin and Operations Pages have separate Cloudflare Access applications. The Pages Functions gateway forwards the Access JWT assertion to the Worker, which validates issuer, audience, expiry, signature and the administrator email allow-list before accepting Admin API calls. Public Web User requests without an assertion cannot access Admin APIs. CI publishing remains restricted to the Worker and uses a separate publisher secret.

If the project names or hostnames are changed, update `scripts/provision-cloudflare-access.mjs`, `scripts/provision-cloudflare-resources.mjs`, the deployment workflow and `scripts/smoke-test-cloudflare.mjs` together. If you use custom domains, add them to the Cloudflare Pages projects and the Access application definitions before deploying.

## Health and runtime endpoints

- Worker health: `/healthz`
- API metadata: `/api/v1/meta`
- Release catalog: `/api/v1/published-releases`
- Update check: `/api/v1/update-check?platform=windows&clientBuild=0`
- Public manifest: `/api/v1/public/manifest.json`
- Runtime readiness: `/api/v1/runtime/readiness` (boolean checks only; no secret values)

Do not consider deployment successful merely because a commit was pushed. Confirm the GitHub Actions run completes and the live smoke tests pass.

## Releases

The Admin Console can package a source bundle, create a release manifest/checksums and publish artifacts through the Worker API. A release is shown as available only when a real artifact exists in R2. This repository does not claim to include signed production EXE/APK/IPA packages; native binaries must be built and signed on the appropriate platform runner before publication.

## Troubleshooting

- Missing credentials: check GitHub Actions secrets/variables and Cloudflare API-token permissions.
- Admin or Operations redirect/403: log in with an email included in `CF_ACCESS_ADMIN_EMAILS` and verify the Access applications match the deployed hostname.
- Admin API returns 401/403 after login: confirm the Pages Access assertion is forwarded, the Pages app audience is present in `CF_ACCESS_AUD`, and the Worker was redeployed after Access provisioning.
- Empty release catalog: expected if no real artifact has been published.
- Smoke-test failure: inspect the first failing job step; do not mark release successful until health and readiness checks pass.


## Đồng bộ từ `hendy-server-app-store`

Mã nguồn upstream được giữ tại `integrations/hendy-server-app-store/` để bảo toàn các module riêng của App Store (Pages Functions, D1 migrations, upload chứng thư mã hóa, sync logs và các thành phần tải ứng dụng) mà không ghi đè Worker API và cấu hình ba Pages hiện tại. Đây là bản nguồn tích hợp tham chiếu; các Pages Functions trong thư mục này **không tự động được triển khai** vì dự án đích dùng Worker API chung làm backend.

Nguồn: https://github.com/ngogiaidy56-eng/hendy-server-app-store  
Đồng bộ lại: `npm run sync:app-store` hoặc GitHub Actions → **Sync App Store upstream**. Workflow chỉ nhập mã nguồn, loại bỏ media sinh tự động và file cấu hình Firebase riêng; không lấy file secret hay ghi đè cấu hình triển khai ở root.

Trạng thái triển khai vẫn phải được xác minh bằng GitHub Actions và smoke tests; việc đồng bộ source không tự khẳng định dịch vụ đã deploy thành công.
