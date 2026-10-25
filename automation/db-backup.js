// Use Cloudflare D1 export/backup APIs in CI with scoped credentials; do not copy secrets to logs.
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !apiToken) {
  console.error("Backup skipped: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.");
  process.exitCode = 1;
} else {
  console.log("Backup prerequisites are present. Configure scheduled D1 export to R2 and verify retention in Cloudflare.");
}
