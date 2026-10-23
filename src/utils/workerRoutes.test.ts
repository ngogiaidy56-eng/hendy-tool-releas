import test from "node:test";
import assert from "node:assert/strict";
import worker, { type Env } from "../worker.ts";

function request(path: string, method = "GET"): Request {
  return new Request(`https://hendy-tool-releas.ngogiaidy56.workers.dev${path}`, { method });
}

const fakeAssets = {
  async fetch(input: Request | string): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input);
    const path = new URL(req.url).pathname;
    if (path === "/admin.html") {
      return new Response("<!doctype html><title>Hendy Admin Console</title><div id=\"root\"></div><script type=\"module\" src=\"/src/admin-main.tsx\"></script>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    if (path === "/" || path === "/index.html") {
      return new Response("<!doctype html><title>Hendy Store</title><div id=\"root\"></div>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};

test("health endpoint is available without a storage bucket", async () => {
  const response = await worker.fetch(request("/healthz"), { APP_NAME: "Hendy Test" } satisfies Env);
  assert.equal(response.status, 200);
  const payload = await response.json() as { status: string; runtime: string; service: string };
  assert.equal(payload.status, "healthy");
  assert.equal(payload.runtime, "cloudflare-workers");
  assert.equal(payload.service, "Hendy Test");
});

test("metadata endpoint returns the public workers.dev URL", async () => {
  const response = await worker.fetch(request("/api/v1/meta"), {
    ASSETS: fakeAssets,
    PUBLIC_BASE_URL: "https://hendy-tool-releas.ngogiaidy56.workers.dev",
  } satisfies Env);
  assert.equal(response.status, 200);
  const payload = await response.json() as { frontend: string; api: { releases: string } };
  assert.equal(payload.frontend, "https://hendy-tool-releas.ngogiaidy56.workers.dev");
  assert.equal(payload.api.releases, "/api/v1/releases");
});

test("release API never presents absent R2 artifacts as downloadable", async () => {
  const response = await worker.fetch(request("/api/releases"), {} satisfies Env);
  assert.equal(response.status, 200);
  const payload = await response.json() as { available: number; releases: Array<{ available: boolean; downloadUrl: string | null; sha256: string | null }> };
  assert.equal(payload.available, 0);
  assert.ok(payload.releases.every((release) => !release.available && release.downloadUrl === null && release.sha256 === null));
});

test("download endpoint gives an explicit configuration error if storage is missing", async () => {
  const response = await worker.fetch(request("/api/releases/download?platform=windows"), {} satisfies Env);
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.equal(payload.error, "release_storage_not_configured");
});

test("unknown API routes return 404 JSON rather than the SPA page", async () => {
  const response = await worker.fetch(request("/api/not-a-route"), { ASSETS: fakeAssets } satisfies Env);
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") || "", /application\/json/);
});

test("the root URL serves the compiled SPA index document", async () => {
  const response = await worker.fetch(request("/"), { ASSETS: fakeAssets } satisfies Env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  assert.match(await response.text(), /id="root"/);
});

test("admin UI shows a private setup page if Cloudflare Access variables are missing", async () => {
  const response = await worker.fetch(request("/admin"), { ASSETS: fakeAssets } satisfies Env);
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") || "", /text\\/html/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.match(await response.text(), /Access setup required/);
});

test("admin UI and status API reject requests without a Cloudflare Access assertion", async () => {
  const env = {
    ASSETS: fakeAssets,
    CF_ACCESS_TEAM_DOMAIN: "https://hendyteam.cloudflareaccess.com",
    CF_ACCESS_AUD: "access-audience",
  } satisfies Env;
  const uiResponse = await worker.fetch(request("/admin"), env);
  assert.equal(uiResponse.status, 401);
  assert.match(uiResponse.headers.get("content-type") || "", /text\\/html/);
  assert.match(await uiResponse.text(), /Authentication required/);

  const statusResponse = await worker.fetch(request("/api/v1/admin/status"), env);
  assert.equal(statusResponse.status, 401);
  assert.equal((await statusResponse.json() as { error: string }).error, "cloudflare_access_required");
});

test("release manifest is available and does not claim unpublished binaries are ready", async () => {
  const response = await worker.fetch(request("/api/v1/public/manifest.json"), {} satisfies Env);
  assert.equal(response.status, 200);
  const payload = await response.json() as { artifacts: Array<{ available: boolean; verified: boolean; url: string | null }> };
  assert.equal(payload.artifacts.length, 2);
  assert.ok(payload.artifacts.every((artifact) => !artifact.available && !artifact.verified && artifact.url === null));
});

test("artifact URL is routed to the release storage handler", async () => {
  const response = await worker.fetch(request("/api/v1/downloads/artifacts/HendyToolsPro-3.2.0-Setup.exe"), {} satisfies Env);
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.equal(payload.error, "release_storage_not_configured");
});

test("published R2 artifacts appear in the manifest with their real SHA-256", async () => {
  const sha256 = "a".repeat(64);
  const storage = {
    async head() {
      return { size: 4, customMetadata: { sha256, publishedAt: "2026-10-23T00:00:00.000Z" } };
    },
    async get() {
      return {
        size: 4,
        customMetadata: { sha256 },
        httpMetadata: { contentType: "application/octet-stream" },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("test"));
            controller.close();
          },
        }),
      };
    },
  };
  const response = await worker.fetch(request("/api/v1/public/manifest.json"), { RELEASES_BUCKET: storage } satisfies Env);
  assert.equal(response.status, 200);
  const payload = await response.json() as { artifacts: Array<{ available: boolean; verified: boolean; sha256: string | null }> };
  assert.ok(payload.artifacts.every((artifact) => artifact.available && artifact.verified && artifact.sha256 === sha256));
});

test("published artifact streams from R2 with download headers", async () => {
  const sha256 = "b".repeat(64);
  const storage = {
    async head() {
      return { size: 4, customMetadata: { sha256 } };
    },
    async get() {
      return {
        size: 4,
        customMetadata: { sha256 },
        httpMetadata: { contentType: "application/octet-stream" },
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("test"));
            controller.close();
          },
        }),
      };
    },
  };
  const response = await worker.fetch(request("/api/v1/downloads/artifacts/HendyToolsPro-3.2.0-Setup.exe"), { RELEASES_BUCKET: storage } satisfies Env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-artifact-sha256"), sha256);
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="HendyToolsPro-3.2.0-Setup.exe"');
  assert.equal(await response.text(), "test");
});


test("published releases endpoint lists real R2 objects", async () => {
  const bucket = {
    async head() { return null; },
    async get() { return null; },
    async list() {
      return {
        objects: [{
          key: "published/demo-app/1.0.0/demo-app.zip",
          size: 12,
          uploaded: new Date("2026-10-23T10:00:00.000Z"),
          customMetadata: {
            appName: "Demo App",
            appSlug: "demo-app",
            version: "1.0.0",
            platform: "web",
            fileName: "demo-app.zip",
            sha256: "c".repeat(64),
            publishedAt: "2026-10-23T10:00:00.000Z",
            releaseNotes: "Initial bundle",
          },
        }],
        truncated: false,
      };
    },
  };
  const response = await worker.fetch(request("/api/v1/published-releases"), { RELEASES_BUCKET: bucket } satisfies Env);
  assert.equal(response.status, 200);
  const payload = await response.json() as { total: number; releases: Array<{ fileName: string; sha256: string; downloadUrl: string }> };
  assert.equal(payload.total, 1);
  assert.equal(payload.releases[0].fileName, "demo-app.zip");
  assert.equal(payload.releases[0].sha256, "c".repeat(64));
  assert.ok(payload.releases[0].downloadUrl.includes("/api/v1/published/downloads/"));
});

test("publish endpoint requires a configured secret before accepting uploads", async () => {
  const response = await worker.fetch(new Request("https://hendy-tool-releas.ngogiaidy56.workers.dev/api/v1/admin/publish", {
    method: "POST",
    body: new FormData(),
  }), {
    RELEASES_BUCKET: {
      async head() { return null; },
      async get() { return null; },
      async put() { return { size: 0 }; },
    },
  } satisfies Env);
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.equal(payload.error, "publish_not_configured");
});

test("publish endpoint requires Cloudflare Access settings even when publish secret exists", async () => {
  const response = await worker.fetch(new Request("https://hendy-tool-releas.ngogiaidy56.workers.dev/api/v1/admin/publish", {
    method: "POST",
    body: new FormData(),
  }), {
    RELEASE_PUBLISH_TOKEN: "configured-secret",
    RELEASES_BUCKET: { async head() { return null; }, async get() { return null; }, async put() { return { size: 0 }; } },
  } satisfies Env);
  assert.equal(response.status, 503);
  const payload = await response.json() as { error: string };
  assert.equal(payload.error, "admin_access_not_configured");
});

test("publish endpoint rejects requests without a Cloudflare Access assertion", async () => {
  const response = await worker.fetch(new Request("https://hendy-tool-releas.ngogiaidy56.workers.dev/api/v1/admin/publish", {
    method: "POST",
    body: new FormData(),
  }), {
    RELEASE_PUBLISH_TOKEN: "configured-secret",
    CF_ACCESS_TEAM_DOMAIN: "https://hendyteam.cloudflareaccess.com",
    CF_ACCESS_AUD: "access-audience",
    RELEASES_BUCKET: { async head() { return null; }, async get() { return null; }, async put() { return { size: 0 }; } },
  } satisfies Env);
  assert.equal(response.status, 401);
  const payload = await response.json() as { error: string };
  assert.equal(payload.error, "cloudflare_access_required");
});


test("storefront config endpoint returns an editable default configuration", async () => {
  const response = await worker.fetch(request("/api/v1/store-config"), {} satisfies Env);
  assert.equal(response.status, 200);
  const payload = await response.json() as { success: boolean; config: { brandName: string; heroTitle: string } };
  assert.equal(payload.success, true);
  assert.equal(payload.config.brandName, "Hendy Store");
  assert.equal(payload.config.heroTitle, "Tất cả ứng dụng");
});

test("a valid Access JWT opens the isolated admin HTML and status API without exposing secrets", async () => {
  const teamDomain = "https://hendyteam.cloudflareaccess.com";
  const audience = "access-audience";
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey) as JsonWebKey & { kid?: string };
  publicJwk.kid = "test-access-key";
  const encode = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  };
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test-access-key" }));
  const claims = encode(JSON.stringify({ iss: teamDomain, aud: audience, exp: now + 300, nbf: now - 10, iat: now }));
  const signingInput = header + "." + claims;
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(signingInput)));
  const token = signingInput + "." + encode(signature);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/cdn-cgi/access/certs")) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), { headers: { "Content-Type": "application/json" } });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
  try {
    const env = {
      ASSETS: fakeAssets,
      RELEASE_PUBLISH_TOKEN: "must-not-leak",
      CF_ACCESS_TEAM_DOMAIN: teamDomain,
      CF_ACCESS_AUD: audience,
      RELEASES_BUCKET: { async head() { return null; }, async get() { return null; }, async put() { return { size: 0 }; }, async list() { return { objects: [] }; } },
    } satisfies Env;
    const uiRequest = new Request("https://hendy-tool-releas.ngogiaidy56.workers.dev/admin", {
      headers: { "Cf-Access-Jwt-Assertion": token },
    });
    const uiResponse = await worker.fetch(uiRequest, env);
    assert.equal(uiResponse.status, 200);
    assert.match(await uiResponse.text(), /Hendy Admin Console/);
    assert.equal(uiResponse.headers.get("cache-control"), "no-store");
    assert.equal(uiResponse.headers.get("x-robots-tag"), "noindex, nofollow");

    const statusRequest = new Request("https://hendy-tool-releas.ngogiaidy56.workers.dev/api/v1/admin/status", {
      headers: { "Cf-Access-Jwt-Assertion": token },
    });
    const statusResponse = await worker.fetch(statusRequest, env);
    assert.equal(statusResponse.status, 200);
    const body = await statusResponse.text();
    assert.ok(!body.includes("must-not-leak"));
    assert.match(body, /"publishSecretConfigured": true/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("publish endpoint accepts a valid server-side CI bearer secret and stores a real artifact", async () => {
  const stored = new Map<string, { body: ArrayBuffer; customMetadata?: Record<string, string> }>();
  const bucket = {
    async head(key: string) {
      const item = stored.get(key);
      return item ? { size: item.body.byteLength, customMetadata: item.customMetadata } : null;
    },
    async get(key: string) {
      const item = stored.get(key);
      if (!item) return null;
      return { size: item.body.byteLength, customMetadata: item.customMetadata, httpMetadata: { contentType: "application/zip" }, body: new Response(item.body).body! };
    },
    async put(key: string, value: ArrayBuffer | ArrayBufferView | string, options?: { customMetadata?: Record<string, string> }) {
      let body: ArrayBuffer;
      if (typeof value === "string") body = new TextEncoder().encode(value).buffer;
      else if (value instanceof ArrayBuffer) body = value;
      else body = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
      stored.set(key, { body, customMetadata: options?.customMetadata });
      return { size: body.byteLength, key, customMetadata: options?.customMetadata };
    },
    async list() { return { objects: [] }; },
  };
  const form = new FormData();
  form.set("appName", "Demo Web App");
  form.set("appSlug", "demo-web-app");
  form.set("version", "1.2.3");
  form.set("platform", "web");
  form.set("releaseNotes", "CI-generated release archive");
  form.set("file", new File([new Uint8Array([1, 2, 3, 4])], "demo-web-app.zip", { type: "application/zip" }));
  const response = await worker.fetch(new Request("https://hendy-tool-releas.ngogiaidy56.workers.dev/api/v1/admin/publish", {
    method: "POST",
    headers: { Authorization: "Bearer ci-publisher-secret" },
    body: form,
  }), { RELEASE_PUBLISH_TOKEN: "ci-publisher-secret", RELEASES_BUCKET: bucket } satisfies Env);
  assert.equal(response.status, 201);
  const payload = await response.json() as { key: string; sha256: string; downloadUrl: string };
  assert.equal(payload.key, "published/demo-web-app/1.2.3/demo-web-app.zip");
  assert.equal(payload.sha256, "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a");
  assert.ok(stored.has(payload.key));
  assert.ok(payload.downloadUrl.includes("/api/v1/published/downloads/"));
});
