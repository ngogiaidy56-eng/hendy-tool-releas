import { appendFileSync } from "node:fs";

const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
const apiToken = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID is missing or invalid. Add it as a GitHub Actions variable/secret.");
}
if (!apiToken) {
  throw new Error("CLOUDFLARE_API_TOKEN is missing. Add a scoped Cloudflare API token as a GitHub Actions secret.");
}

const apiBase = "https://api.cloudflare.com/client/v4";
async function cloudflareApi(path, init = {}) {
  const response = await fetch(apiBase + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + apiToken,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error("Cloudflare API returned a non-JSON response for " + path + " (HTTP " + response.status + ")."); }
  if (!response.ok || payload.success !== true) {
    const reasons = Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.message || item.code).filter(Boolean).join("; ")
      : "";
    throw new Error("Cloudflare API failed for " + path + " (HTTP " + response.status + ")" + (reasons ? ": " + reasons : "") + ".");
  }
  return payload.result;
}

async function ensureR2Bucket() {
  const result = await cloudflareApi("/accounts/" + accountId + "/r2/buckets?per_page=1000");
  const buckets = Array.isArray(result) ? result : (result?.buckets || []);
  if (buckets.some((bucket) => bucket.name === "hendy-tool-releases")) {
    console.log("Runtime resource ready: R2 bucket hendy-tool-releases already exists.");
    return;
  }
  await cloudflareApi("/accounts/" + accountId + "/r2/buckets", {
    method: "POST",
    body: JSON.stringify({ name: "hendy-tool-releases" }),
  });
  console.log("Runtime resource created: R2 bucket hendy-tool-releases.");
}

async function ensurePagesProject() {
  const result = await cloudflareApi("/accounts/" + accountId + "/pages/projects?per_page=1000");
  const projects = Array.isArray(result) ? result : [];
  if (projects.some((project) => project.name === "hendy-tool-releas")) {
    console.log("Runtime resource ready: Pages project hendy-tool-releas already exists.");
    return;
  }
  await cloudflareApi("/accounts/" + accountId + "/pages/projects", {
    method: "POST",
    body: JSON.stringify({
      name: "hendy-tool-releas",
      production_branch: "main",
      build_config: {
        build_command: "npm run build",
        destination_dir: "dist",
        root_dir: "/",
      },
      deployment_configs: {
        production: {
          env_vars: {
            BACKEND_ORIGIN: {
              type: "plain_text",
              value: "https://hendy-tool-releas.ngogiaidy56.workers.dev",
            },
            ENVIRONMENT: { type: "plain_text", value: "production" },
            APP_NAME: { type: "plain_text", value: "Hendy Store — App Store & Software Releases" },
          },
        },
      },
    }),
  });
  console.log("Runtime resource created: Pages project hendy-tool-releas.");
}

await ensureR2Bucket();
await ensurePagesProject();
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "### Cloudflare resources",
    "",
    "- R2 bucket: `hendy-tool-releases` — ready",
    "- Pages project: `hendy-tool-releas` — ready",
    "- Worker vars are sourced from `wrangler.toml`; Pages vars are sourced from `wrangler.pages.toml` and its runtime project config.",
    "",
  ].join("\n"));
}
