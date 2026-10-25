const workerBase = (process.env.APP_BASE_URL || "https://hendy-tool-releas.ngogiaidy56.workers.dev").replace(/\/$/, "");
const pagesBase = (process.env.PAGES_BASE_URL || "https://hendy-web-user.pages.dev").replace(/\/$/, "");
const adminPagesBase = (process.env.ADMIN_PAGES_BASE_URL || "https://hendy-web-admin.pages.dev").replace(/\/$/, "");
const opsPagesBase = (process.env.OPS_PAGES_BASE_URL || "https://hendy-operations.pages.dev").replace(/\/$/, "");
const maxAttempts = Number(process.env.SMOKE_RETRIES || 8);
const delayMs = Number(process.env.SMOKE_DELAY_MS || 4000);
async function fetchWithRetry(url, options = {}, predicate = (response) => response.ok) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000), redirect: "manual" }); if (predicate(response)) return response; lastError = new Error(url + " returned HTTP " + response.status); }
    catch (error) { lastError = error; }
    if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw lastError || new Error("Smoke test request failed: " + url);
}
function assert(condition, message) { if (!condition) throw new Error(message); }
const healthResponse = await fetchWithRetry(workerBase + "/healthz");
assert(healthResponse.status === 200, "Worker health check failed.");
const health = await healthResponse.json(); assert(health.status === "healthy", "Worker health payload is not healthy.");
const readyResponse = await fetchWithRetry(workerBase + "/api/v1/runtime/readiness");
const readiness = await readyResponse.json();
assert(readiness.success === true, "Worker readiness endpoint returned an error.");
assert(readiness.checks?.staticAssets === true, "Worker static Assets binding is missing.");
assert(readiness.checks?.releaseStorage === true, "R2 release storage is not fully bound.");
assert(readiness.checks?.adminAccess === true, "Cloudflare Access runtime variables were not linked.");
assert(readiness.checks?.ciPublisher === true, "RELEASE_PUBLISH_TOKEN is missing from the Worker runtime.");
assert(readiness.adminReady === true, "Admin workspace is not ready. Missing runtime items: " + (readiness.missing || []).join(", "));
assert(readiness.ready === true, "Worker is not fully ready. Missing runtime items: " + (readiness.missing || []).join(", "));
assert(Array.isArray(readiness.missing) && readiness.missing.length === 0, "Runtime provisioner did not link all required bindings and secrets.");
const workerReleases = await (await fetchWithRetry(workerBase + "/api/v1/published-releases")).json();
assert(workerReleases.success === true && Array.isArray(workerReleases.releases), "Worker catalog response is invalid.");
const pagesReleases = await (await fetchWithRetry(pagesBase + "/api/v1/published-releases")).json();
assert(pagesReleases.success === true && Array.isArray(pagesReleases.releases), "Web User Pages API gateway did not return the Worker catalog.");
const adminPage = await fetchWithRetry(adminPagesBase + "/", {}, response => [302, 303, 307, 308, 401, 403].includes(response.status));
assert([302, 303, 307, 308, 401, 403].includes(adminPage.status), "Web Admin Pages must require Cloudflare Access.");
const opsPage = await fetchWithRetry(opsPagesBase + "/", {}, response => [302, 303, 307, 308, 401, 403].includes(response.status));
assert([302, 303, 307, 308, 401, 403].includes(opsPage.status), "Operations Pages must require Cloudflare Access.");
const publicAdminApi = await fetchWithRetry(pagesBase + "/api/v1/admin/status", {}, response => [401, 403].includes(response.status));
assert([401, 403].includes(publicAdminApi.status), "Unauthenticated public Pages must not access Admin API.");
const pagesCiResponse = await fetchWithRetry(pagesBase + "/api/v1/ci/publish", { method: "POST", body: new FormData() }, response => response.status === 403);
const pagesCi = await pagesCiResponse.json(); assert(pagesCi.error === "ci_publish_requires_primary_origin", "CI publisher endpoint must remain on the Worker.");
console.log(JSON.stringify({ success: true, worker: workerBase, pages: { webUser: pagesBase, webAdmin: adminPagesBase, operations: opsPagesBase }, checks: { workerHealth: true, runtimeReadiness: readiness.ready, workerCatalog: true, webUserProxy: true, adminAccessGate: true, operationsAccessGate: true, publicAdminApiDenied: true, ciPublisherRestricted: true } }, null, 2));
