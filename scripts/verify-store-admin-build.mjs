import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const storeHtml = read("dist/index.html");
const adminHtml = read("dist/admin.html");
const storeEntry = read("src/main.tsx");
const adminEntry = read("src/admin-main.tsx");
const publicApp = read("src/App.tsx");
const viteConfig = read("vite.config.ts");
const worker = read("src/worker.ts");
const workerTests = read("src/utils/workerRoutes.test.ts");
const wrangler = read("wrangler.toml");
const pagesGateway = read("functions/api/[[path]].ts");
const accessProvisioner = read("scripts/provision-cloudflare-access.mjs");
const resourcesProvisioner = read("scripts/provision-cloudflare-resources.mjs");
const deployWorkflow = read(".github/workflows/deploy-cloudflare.yml");
const pagesWrangler = read("wrangler.pages.toml");
const bootstrapWrangler = read("wrangler.bootstrap.toml");
const packageJson = JSON.parse(read("package.json"));

assert.notEqual(storeHtml, adminHtml, "Storefront and Admin must be separate HTML documents");
assert.match(storeHtml, /Hendy Store/, "Storefront branding must exist in its built document");
assert.match(adminHtml, /Hendy Admin Console/, "Admin branding must exist in its built document");
assert.match(storeHtml, /\/assets\/[^\" ]+\.js/, "Storefront JavaScript bundle must be emitted");
assert.match(adminHtml, /\/assets\/[^\" ]+\.js/, "Admin JavaScript bundle must be emitted");
assert.match(storeEntry, /\.\/store\.css/, "Storefront must import only its own stylesheet entry");
assert.match(adminEntry, /StudioWorkspace/, "Admin entrypoint must mount the Admin Console");
assert.match(adminEntry, /\.\/admin\.css/, "Admin entrypoint must import its own stylesheet");
assert.match(publicApp, /StorefrontV2/, "Public React app must mount the Storefront");
assert.doesNotMatch(read("src/interface/store/StorefrontV2.tsx"), /onOpenAdmin|Developer Studio|Trung tâm nhà phát triển|Repository mã nguồn|Source code|github\.com\/ngogiaidy56-eng\/hendy-tool-releas/, "Storefront must not expose Admin or repository links");
assert.doesNotMatch(worker, /Đường dẫn quản trị được bảo vệ|CF_ACCESS_TEAM_DOMAIN \+ CF_ACCESS_AUD/, "Admin denied page must not display protected-path/security configuration details");
assert.doesNotMatch(publicApp, /StudioWorkspace/, "Public React app must not bundle the Admin view");
assert.match(viteConfig, /index\.html/, "Vite must include the Storefront entry");
assert.match(viteConfig, /admin\.html/, "Vite must include the Admin entry");
assert.match(worker, /adminAccessPage\(denied\.status\)/, "Worker must fail closed for unauthenticated Admin routes");
assert.match(worker, /CF_ACCESS_ADMIN_EMAILS/, "Worker must enforce the Admin email allow-list");
assert.match(wrangler, /run_worker_first\s*=\s*\[[^\]]*\/admin\*/, "Static Assets must route Admin requests through the Worker first");


assert.ok(worker.includes("function runtimeChecks(env: Env)"), "Worker must expose runtime readiness checks");
assert.ok(worker.includes("function runtimeMissingChecks(checks: ReturnType<typeof runtimeChecks>)"), "Worker must expose actionable missing-runtime diagnostics");
const adminWorkspace = read("src/interface/admin/StudioWorkspace.tsx");
assert.ok(adminWorkspace.includes("/api/v1/runtime/readiness"), "Admin workspace must load live runtime readiness");
assert.ok(adminWorkspace.includes("Môi trường chưa sẵn sàng cho phát hành"), "Admin workspace must explain an incomplete runtime configuration");
assert.ok(adminWorkspace.includes("Chạy workflow triển khai"), "Admin workspace must link directly to the deployment workflow");

assert.ok(worker.includes('/api/v1/runtime/readiness'), "Worker must expose a non-secret runtime readiness endpoint");
assert.ok(worker.includes("expectedAudiences.some((expected) => aud.includes(expected))"), "Worker must support multiple protected-path Access audiences");
const adminAuthStart = worker.indexOf("async function authorizeAdmin(");
const adminAuthEnd = worker.indexOf("\n}", adminAuthStart);
assert.ok(adminAuthStart >= 0 && adminAuthEnd > adminAuthStart, "Worker Admin authorizer must exist");
const adminAuth = worker.slice(adminAuthStart, adminAuthEnd);
assert.ok(adminAuth.includes("return verifyCloudflareAccess(request, env)"), "All interactive Admin API calls must use Cloudflare Access");
assert.doesNotMatch(adminAuth, /RELEASE_PUBLISH_TOKEN|tokenMatches/, "CI publisher secret must not authorize general Admin API operations");
assert.ok(workerTests.includes("CI publisher token cannot authorize interactive Admin configuration changes"), "Regression test must enforce separate CI and Admin privileges");

assert.ok(worker.includes("accessConfigured: isCloudflareAccessConfigured(env)"), "Admin status must share Access config validation");
assert.ok(accessProvisioner.includes("ensureOneTimePinIdentityProvider"), "Provisioner must create email OTP login if needed");
assert.ok(accessProvisioner.includes("ensureAdminApplications(teamDomain, identityProviderId)"), "Provisioner must bind Access login to the path-protected apps");
assert.ok(accessProvisioner.includes("writeFileSync(outputPath, JSON.stringify(secrets"), "Runtime secrets must be written to a runner-temporary file");
assert.doesNotMatch(accessProvisioner, /console\.log\([^)]*(publishToken|secrets)/i, "Provisioner must never print secret values");
assert.ok(resourcesProvisioner.includes("hendy-tool-releases"), "Provisioner must ensure the R2 release bucket");
assert.ok(resourcesProvisioner.includes("BACKEND_ORIGIN"), "Provisioner must link Pages API to the Worker origin");
assert.ok(deployWorkflow.includes("wrangler.bootstrap.toml"), "CI must bootstrap Worker before requiring Access secrets");
assert.ok(deployWorkflow.includes("--secrets-file"), "CI must upload the runtime secret bundle during final Worker deploy");
assert.ok(deployWorkflow.includes("smoke-test-cloudflare.mjs"), "CI must smoke-test Worker and Pages after deploy");
assert.ok(deployWorkflow.includes("npm run build:pages:functions"), "Pages Functions gateway must be built separately for each Pages project");
assert.ok(deployWorkflow.includes("dist-pages/web-user"), "Deployment must include the independent web-user build output");
assert.ok(deployWorkflow.includes("dist-pages/web-admin"), "Deployment must include the independent web-admin build output");
assert.ok(deployWorkflow.includes("dist-pages/operations"), "Deployment must include the independent operations build output");
assert.ok(deployWorkflow.includes("npm run verify:pages"), "Deployment must verify all three independent Pages bundles before upload");

assert.ok(deployWorkflow.includes("--no-bundle"), "Pages Direct Upload must upload the already-built Functions bundle");
assert.ok(packageJson.scripts["deploy:pages"].includes("build:pages:functions"), "Manual Pages deployment must build its Functions bundle for each app");
assert.ok(worker.includes('authorization.match(/^Bearer\\s+(.+)$/i)'), "CI publisher must correctly parse a Bearer token");

assert.ok(!pagesGateway.includes("admin_requires_primary_origin"), "Admin Pages API requests must be proxied to the Worker for JWT authorization");
assert.ok(accessProvisioner.includes("hendy-web-admin.pages.dev/*"), "Cloudflare Access must protect the separate Admin Pages hostname");
assert.ok(accessProvisioner.includes("hendy-operations.pages.dev/*"), "Cloudflare Access must protect the Operations Pages hostname");
assert.ok(pagesGateway.includes("ci_publish_requires_primary_origin"), "Pages must not proxy CI publisher uploads");
assert.ok(worker.includes('path === "/api/v1/ci/publish"'), "Worker must expose an isolated CI publish endpoint");
assert.ok(worker.includes("authorizeCiPublisher(request, env)"), "CI publish endpoint must require its own server-side token check");
assert.doesNotMatch(pagesGateway, /HendyToolsPro-3\.1\.2-Setup\.exe|airGapped: true|cpuUsage: 26/, "Pages gateway must not return hard-coded fake platform data");
assert.ok(pagesWrangler.includes("BACKEND_ORIGIN"), "Pages config must declare the backend origin");
assert.ok(!viteConfig.includes("__dirname"), "Vite config must work with ESM-native loading");
assert.ok(bootstrapWrangler.includes('directory = "./.worker-dist"'), "Bootstrap Worker must use prepared assets");
assert.ok(wrangler.includes('required = ["RELEASE_PUBLISH_TOKEN", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD", "CF_ACCESS_ADMIN_EMAILS"]'), "Production Worker config must declare every required runtime secret");

console.log("Verified: separate Storefront/Admin builds, runtime provisioning, required Access secrets, and Workers & Pages deployment hooks.");
