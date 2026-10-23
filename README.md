# Hendy Tools Platform & App Downloader

Hendy Tools is a React 19 + Vite single-page app. The primary production target is a Cloudflare Worker that serves both the compiled frontend and the edge API.

## Primary application URL

**https://hendy-tool-releas.ngogiaidy56.workers.dev/**

Useful checks after successful deployment:

- UI: `/`
- Health: `/healthz`
- API metadata: `/api/v1/meta`
- Release catalog: `/api/v1/releases`
- Update check: `/api/v1/update-check?platform=windows&clientBuild=0`
- Release manifest: `/api/v1/public/manifest.json`
- Domain overview: `/api/v1/domains`
- Edge telemetry: `/api/v1/telemetry`

## Connect this repository to Cloudflare Workers Builds

Cloudflare account authorization is an interactive step and must be approved in the Dashboard. The repository is prepared for that connection.

1. Open [Workers & Pages](https://dash.cloudflare.com/918ff2f016938fc978ed23b96505b21e/workers-and-pages).
2. Select the existing Worker named `hendy-tool-releas`. If the Worker does not yet exist, create/import a Worker with this exact name first; the name determines the requested `workers.dev` hostname.
3. Open **Settings → Builds → Connect** and authorize the Cloudflare Git integration for GitHub. Select repository `ngogiaidy56-eng/hendy-tool-releas`.
4. Set the production branch to `main` and root directory to the repository root (leave it blank or use `.`).
5. Set **Build command** to:

   ```bash
   npm run build
   ```

   Workers Builds installs project dependencies before running this command. Do not repeat `npm install` in the build command; keep one package-manager install step so stale dependency trees are not mixed.

6. Set **Deploy command** to:

   ```bash
   npm run deploy:worker
   ```

7. Ensure the bucket `hendy-tool-releases` exists in Cloudflare R2 before deploying. The Worker config binds that bucket as `RELEASES_BUCKET`. If it is missing, create it in the Dashboard under R2 or use `npx wrangler@4 r2 bucket create hendy-tool-releases`.
8. Save the build settings, then push a commit to `main` to trigger the first Cloudflare build. Watch the build and deployment status from the Worker’s **Builds** view. Saving settings alone does not prove a successful deployment.

Official setup guide: [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/). Build settings are managed in **Worker → Settings → Builds**; Cloudflare applies saved configuration on the next build. The Worker name in the Dashboard must match the Wrangler `name` value.

## Repository deployment files

- `src/worker.ts`: Worker request router for the frontend, health checks, API metadata, release listing, update checks, manifests and R2 artifact delivery.
- `wrangler.toml`: **canonical Worker configuration** for Cloudflare Workers Builds. This is the file used by `npm run deploy:worker`; Worker assets are read from `.worker-dist/`.
- `scripts/prepare-worker-assets.mjs`: prepares `.worker-dist/` from `dist/` and removes only the Pages `_redirects` catch-all rewrite, which Cloudflare Workers rejects as a redirect loop. The original `dist/` remains unchanged for Pages deployment.
- `wrangler.worker.toml`: compatibility copy of the Worker config for older manual commands. It also points to `.worker-dist/`; prefer the root `wrangler.toml` for Workers Builds.
- `wrangler.pages.toml`: reference settings for the optional separate Pages project. Pages project runtime variables should be set in that project's Dashboard when using Direct Upload.
- `functions/api/[[path]].ts`: optional Pages Functions API gateway. Set `BACKEND_ORIGIN=https://hendy-tool-releas.ngogiaidy56.workers.dev` in the Pages project's production environment if API paths should proxy to the Worker.
- `server.ts`: optional Express server for Node/Render. Cloudflare Workers does not run this file.
- `.github/workflows/deploy-cloudflare.yml`: manual workflow for the separate Pages Direct Upload project. The primary Worker deploy is handled by Cloudflare Workers Builds to avoid two production deploy systems competing over the same Worker.

## Local validation / manual deployment

Requires Node.js 22+. The `public/_redirects` rule is retained in `dist/` for Pages. Worker deployment creates a separate `.worker-dist/` without that Pages-only file, while Wrangler's `not_found_handling = "single-page-application"` provides Worker-side SPA fallback.

```bash
npm install
npm run lint
npm test
npm run build

# Deploy the primary Worker + UI + API:
npm run deploy:worker

# Optional: deploy the Pages Direct Upload project:
npm run deploy:pages
```

For local manual Worker deployment, authenticate with `npx wrangler@4 login` first. For automation outside Workers Builds, provide a scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through the CI secret manager; do not commit tokens.

## Release artifacts

The API intentionally reports release packages as unavailable until the real binary exists in R2. This repository does not contain proven signed production Windows installers or Android APKs. Upload a real artifact to the configured object key before advertising it as downloadable:

- `windows/3.2.0/HendyToolsPro-3.2.0-Setup.exe`
- `android/3.2.0/HendyToolsMobile-3.2.0.apk`

The manifest reports a checksum as verified only when a valid 64-character SHA-256 value is present in the object's R2 custom metadata under `sha256`. Build, sign, calculate the checksum, and upload the actual packages before release.
