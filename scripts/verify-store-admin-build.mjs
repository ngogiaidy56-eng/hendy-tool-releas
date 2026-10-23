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
const wrangler = read("wrangler.toml");

assert.notEqual(storeHtml, adminHtml, "Storefront and Admin must be separate HTML documents");
assert.match(storeHtml, /Hendy Store/, "Storefront branding must exist in its built document");
assert.match(adminHtml, /Hendy Admin Console/, "Admin branding must exist in its built document");
assert.match(storeHtml, /\/assets\/[^\" ]+\.js/, "Storefront JavaScript bundle must be emitted");
assert.match(adminHtml, /\/assets\/[^\" ]+\.js/, "Admin JavaScript bundle must be emitted");
assert.match(storeEntry, /\.\/store\.css/, "Storefront must import only its own stylesheet entry");
assert.match(adminEntry, /StudioWorkspace/, "Admin entrypoint must mount the Admin Console");
assert.match(adminEntry, /\.\/admin\.css/, "Admin entrypoint must import its own stylesheet");
assert.match(publicApp, /StorefrontV2/, "Public React app must mount the Storefront");
assert.doesNotMatch(publicApp, /StudioWorkspace/, "Public React app must not bundle the Admin view");
assert.match(viteConfig, /index\.html/, "Vite must include the Storefront entry");
assert.match(viteConfig, /admin\.html/, "Vite must include the Admin entry");
assert.match(worker, /adminAccessPage\(denied\.status\)/, "Worker must fail closed for unauthenticated Admin routes");
assert.match(worker, /CF_ACCESS_ADMIN_EMAILS/, "Worker must enforce the Admin email allow-list");
assert.match(wrangler, /run_worker_first\s*=\s*\[[^\]]*\/admin\*/, "Static Assets must route Admin requests through the Worker first");

console.log("Verified: separate Storefront/Admin HTML, React and CSS entrypoints, plus Worker-first Admin authentication.");
