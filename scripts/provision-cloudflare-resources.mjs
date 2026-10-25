import { appendFileSync } from "node:fs";

const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("CLOUDFLARE_ACCOUNT_ID is missing or invalid.");
if (!apiToken) throw new Error("CLOUDFLARE_API_TOKEN is missing.");
const apiBase = "https://api.cloudflare.com/client/v4";
async function api(path, init = {}) {
  const response = await fetch(apiBase + path, { ...init, headers: { Authorization: "Bearer " + apiToken, "Content-Type": "application/json", ...(init.headers || {}) } });
  let payload; try { payload = await response.json(); } catch { throw new Error("Cloudflare API returned non-JSON for " + path + " (HTTP " + response.status + ")."); }
  if (!response.ok || payload.success !== true) { const detail = Array.isArray(payload.errors) ? payload.errors.map((e) => e.message || e.code).filter(Boolean).join("; ") : ""; throw new Error("Cloudflare API failed for " + path + " (HTTP " + response.status + ")" + (detail ? ": " + detail : "") + "."); }
  return payload.result;
}
async function ensureR2() {
  const result = await api("/accounts/" + accountId + "/r2/buckets?per_page=1000");
  const buckets = Array.isArray(result) ? result : (result?.buckets || []);
  if (!buckets.some((bucket) => bucket.name === "hendy-tool-releases")) await api("/accounts/" + accountId + "/r2/buckets", { method: "POST", body: JSON.stringify({ name: "hendy-tool-releases" }) });
}
async function ensurePages() {
  const result = await api("/accounts/" + accountId + "/pages/projects?per_page=1000");
  const projects = Array.isArray(result) ? result : (result?.projects || []);
  const definitions = [
    { name: "hendy-web-user", appName: "Hendy Store — Web User", directory: "dist-pages/web-user" },
    { name: "hendy-web-admin", appName: "Hendy Admin Console", directory: "dist-pages/web-admin" },
    { name: "hendy-operations", appName: "Hendy Operations Center", directory: "dist-pages/operations" },
  ];
  for (const item of definitions) {
    const desiredVars = { BACKEND_ORIGIN: { type: "plain_text", value: "https://hendy-tool-releas.ngogiaidy56.workers.dev" }, ENVIRONMENT: { type: "plain_text", value: "production" }, APP_NAME: { type: "plain_text", value: item.appName } };
    const existing = projects.find((project) => project.name === item.name);
    if (!existing) {
      await api("/accounts/" + accountId + "/pages/projects", { method: "POST", body: JSON.stringify({ name: item.name, production_branch: "main", build_config: { build_command: "npm run build:pages", destination_dir: item.directory, root_dir: "." }, deployment_configs: { production: { env_vars: desiredVars }, preview: { env_vars: desiredVars } } }) });
      console.log("Created Pages project " + item.name + ".");
      continue;
    }
    const production = existing.deployment_configs?.production || {};
    const preview = existing.deployment_configs?.preview || {};
    const mergeVars = (vars) => ({ ...(vars || {}), ...desiredVars });
    await api("/accounts/" + accountId + "/pages/projects/" + item.name, { method: "PUT", body: JSON.stringify({ name: item.name, production_branch: existing.production_branch || "main", ...(existing.build_config ? { build_config: existing.build_config } : {}), deployment_configs: { production: { ...production, env_vars: mergeVars(production.env_vars) }, preview: { ...preview, env_vars: mergeVars(preview.env_vars) } } }) });
    console.log("Pages project " + item.name + " is ready.");
  }
}
await ensureR2();
await ensurePages();
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, ["### Cloudflare resources", "", "- R2 bucket: hendy-tool-releases — ready", "- Pages: hendy-web-user, hendy-web-admin, hendy-operations — ready", "- Backend API remains on the hendy-tool-releas Worker.", ""].join("\n"));
