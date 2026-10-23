# Hendy Tools Platform & App Downloader

React 19 + Vite frontend, Cloudflare Pages Functions API, and a standalone Cloudflare Worker API entry point.

- `src/`: React/Vite interface and the standalone Worker at `src/worker.ts`.
- `functions/api/[[path]].ts`: Cloudflare Pages Functions routes under `/api/*`.
- `wrangler.toml`: configuration for **Cloudflare Pages only**.
- `wrangler.worker.toml`: configuration for the separate **Cloudflare Worker + static assets** deployment.
- `server.ts`: Express server for a Node/Render deployment; it is **not** the runtime entry point on Cloudflare Pages/Workers.

## Deploy to Cloudflare Workers & Pages

The GitHub workflow `.github/workflows/deploy-cloudflare.yml` validates the app, builds `dist/`, then deploys Pages and the standalone Worker. Every push to `main` deploys both; run it manually from **Actions → Deploy to Cloudflare Pages and Workers** to choose `both`, `pages`, or `worker`.

### 1. Create the Pages project once

In Cloudflare Dashboard → **Workers & Pages**, create/connect a Pages project named exactly:

`hendy-tool-releas`

Use the repository root as the project root. For a dashboard-managed build, set:

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`
- Node.js version: `22` (if the setting is shown)

The GitHub workflow deploys Pages using Wrangler and expects this Pages project to exist. The separate Worker is named `hendy-tool-releas-api`.

### 2. Add GitHub Actions secrets

In GitHub → repository **Settings → Secrets and variables → Actions → Secrets**, add:

- `CLOUDFLARE_API_TOKEN`: a token scoped to the intended Cloudflare account with **Cloudflare Pages: Edit** and **Workers Scripts: Edit** permissions.
- `CLOUDFLARE_ACCOUNT_ID`: the Account ID shown in the Cloudflare Dashboard.

Do not put API tokens or credentials in `wrangler.toml`, `wrangler.worker.toml`, or frontend environment variables.

### 3. Optional backend proxy

The Pages Function can forward API requests to a Node backend when `BACKEND_ORIGIN` is set. Configure it in the Pages project’s **Settings → Variables and Secrets** for the relevant environment. Use the origin only, for example `https://your-service.onrender.com`; do not append an API route.

Without `BACKEND_ORIGIN`, Pages Functions use the repository’s local edge fallback handlers. Cloudflare will not start `server.ts` or run Express.

### 4. Local validation and manual deployment

Requires Node.js 22 or newer.

```bash
npm install
npm run lint
npm test
npm run build

# Deploy Pages (Pages project must already exist)
npx wrangler pages deploy dist --project-name=hendy-tool-releas --branch=main --config=wrangler.toml

# Deploy the standalone Worker and the same dist/ assets
npx wrangler deploy --config=wrangler.worker.toml
```

You can also use **Workers & Pages → Create → Pages / Worker** in the Cloudflare Dashboard. Keep the Pages and Worker configurations separate; do not use the Pages config for `wrangler deploy`.

## Important release-data note

The current API source contains sample release metadata and placeholder download URLs/checksums. A successful Cloudflare deployment publishes the website/API code, but it does not manufacture or sign Windows installers/APKs. Before advertising a binary as verified or production-ready, publish real artifacts (for example to an R2 bucket), calculate SHA-256 from those exact files, and update the manifest/download handlers accordingly.
