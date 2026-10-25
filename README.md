# HendyAppStore — Cloudflare monorepo

This repository hosts three independent Cloudflare Pages: `hendy-web-user` (public downloads), `hendy-web-admin` (protected administration), and `hendy-operations` (operations dashboard). The API and routing are deployed as separate Cloudflare Workers, with D1 for release metadata and R2 for release artifacts.

## Deploy requirements
- GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Cloudflare Pages projects: `hendy-web-user`, `hendy-web-admin`, `hendy-operations`.
- Configure D1 database IDs and R2 bucket bindings in Worker configuration before deployment.
- Protect admin and operations hostnames with Cloudflare Access. Never expose API tokens or signing keys in frontend variables or commit certificate files.

## Platform build status
The repository's validation workflow does not claim to create signed APK, IPA, or EXE artifacts. Add platform-specific build jobs and configure their signing secrets before publishing native releases. The self-healing receiver is alert-only and does not make autonomous production changes.

## Routes
- `GET /healthz`
- `GET /api/v1/meta`
- `GET /api/v1/releases`

Review all environment-specific IDs and domains before running production deployments.
