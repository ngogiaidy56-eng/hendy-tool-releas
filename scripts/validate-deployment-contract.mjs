import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const worker = read("src/worker.ts");
const wrangler = read("wrangler.toml");
const compatibilityWrangler = read("wrangler.worker.toml");
const bootstrap = read("wrangler.bootstrap.toml");
const pages = read("wrangler.pages.toml");
const workflow = read(".github/workflows/deploy-cloudflare.yml");
const resources = read("scripts/provision-cloudflare-resources.mjs");
const access = read("scripts/provision-cloudflare-access.mjs");
const smoke = read("scripts/smoke-test-cloudflare.mjs");
const gitignore = read(".gitignore");

const requiredWorkerSecrets = [
  "RELEASE_PUBLISH_TOKEN",
  "CF_ACCESS_TEAM_DOMAIN",
  "CF_ACCESS_AUD",
  "CF_ACCESS_ADMIN_EMAILS",
];
// Worker secrets are provisioned by the dedicated GitHub Actions deployment workflow
// and passed through --secrets-file. Do not mark them required in the Wrangler config:
// Cloudflare Workers Builds invokes npm run deploy:worker without that file. The Worker
// validates Access at request time and fails closed until its auth secrets are configured.
assert.doesNotMatch(wrangler, /^\\[secrets\\]/m, "Wrangler config must allow Workers Builds to deploy without a local secrets file");
assert.doesNotMatch(compatibilityWrangler, /^\\[secrets\\]/m, "Compatibility Worker config must not require a local secrets file");
for (const name of requiredWorkerSecrets) {
  assert.match(worker, new RegExp("\\b" + name + "\\??\\s*:"), "Worker Env type must declare " + name);
  assert.ok(access.includes(name), "Access provisioner must manage runtime secret " + name);
}
assert.match(wrangler, /binding\s*=\s*"ASSETS"/, "Worker assets binding must be named ASSETS");
assert.match(wrangler, /directory\s*=\s*"\.\/\.worker-dist"/, "Worker must use prepared .worker-dist assets");
assert.match(wrangler, /binding\s*=\s*"RELEASES_BUCKET"/, "Worker must have the release R2 binding");
assert.match(wrangler, /bucket_name\s*=\s*"hendy-tool-releases"/, "R2 bucket name must match the provisioner");
assert.match(worker, /adminReady:\s*checks\.staticAssets && checks\.releaseStorage && checks\.adminAccess/, "Admin readiness must require assets, R2 and Access");
assert.match(worker, /ready:\s*checks\.staticAssets && checks\.releaseStorage && checks\.adminAccess && checks\.ciPublisher/, "Full runtime readiness must require the CI publisher secret");
assert.match(worker, /missing:\s*runtimeMissingChecks\(checks\)/, "Runtime readiness must report actionable missing config names");

assert.match(bootstrap, /binding\s*=\s*"RELEASES_BUCKET"/, "Bootstrap Worker must bind the same R2 bucket");
assert.doesNotMatch(bootstrap, /\[secrets\]/, "Bootstrap config must remain usable before runtime secrets exist");

for (const key of ["ENVIRONMENT", "APP_NAME", "PUBLIC_BASE_URL"]) {
  assert.match(wrangler, new RegExp("\\b" + key + "\\s*="), "Wrangler must declare runtime variable " + key);
  assert.match(worker, new RegExp("\\b" + key + "\\??\\s*:"), "Worker Env type must declare runtime variable " + key);
}
assert.match(pages, /pages_build_output_dir\s*=\s*"\.\/dist"/, "Pages output directory must be dist");
assert.match(pages, /BACKEND_ORIGIN\s*=/, "Pages config must declare BACKEND_ORIGIN");
assert.match(resources, /BACKEND_ORIGIN/, "Provisioner must link Pages BACKEND_ORIGIN");
assert.match(resources, /RELEASES_BUCKET|hendy-tool-releases/, "Provisioner must create or verify the R2 resource");

for (const step of [
  "scripts/provision-cloudflare-resources.mjs",
  "scripts/prepare-worker-assets.mjs",
  "scripts/provision-cloudflare-access.mjs",
  "--secrets-file",
  "scripts/smoke-test-cloudflare.mjs",
]) {
  assert.ok(workflow.includes(step), "Cloudflare deployment workflow must include " + step);
}
assert.match(access, /randomBytes\(32\)/, "Provisioner must generate a publisher token when no reusable token is supplied");
assert.match(access, /CF_ACCESS_TEAM_DOMAIN:\s*teamDomain/, "Provisioner must link the Access issuer into runtime secrets");
assert.match(access, /CF_ACCESS_AUD:\s*audiences\.join\(","\)/, "Provisioner must link audiences for every protected Access path");
assert.match(access, /CF_ACCESS_ADMIN_EMAILS:/, "Provisioner must link the allow-list into runtime secrets");
assert.match(access, /::add-mask::/, "Provisioner must mask generated secrets in GitHub Actions logs");
assert.match(access, /secrets_file=/, "Provisioner must publish the temporary secrets-file path to the workflow");
assert.match(gitignore, /\.runtime/, "Runtime temporary files must be ignored by Git");
assert.match(gitignore, /\.dev\.vars/, "Local Worker secrets must be ignored by Git");
assert.match(smoke, /runtime\/readiness/, "Post-deploy smoke test must inspect Worker readiness");
assert.match(smoke, /pagesBase\s*\+\s*"\/api\/v1\/published-releases"/, "Post-deploy smoke test must inspect the Pages API proxy");
assert.match(workflow, /repository_dispatch:[\s\S]*types:\s*\[deploy-cloudflare\]/, "Deployment workflow must accept the documented repository_dispatch hook");
assert.match(workflow, /wrangler@4 deploy --dry-run --config=wrangler\.toml --secrets-file/, "Deployment must validate linked runtime secrets and assets before production upload");

console.log("Deployment contract verified: Worker bindings, R2, runtime secret provisioning, Pages variables, provisioning outputs, GitHub hooks and live smoke tests are linked.");
