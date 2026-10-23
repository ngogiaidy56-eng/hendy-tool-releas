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
    if (path === "/" || path === "/index.html") {
      return new Response("<!doctype html><div id=\"root\"></div>", {
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

test("client-side routes are rewritten to index.html", async () => {
  const response = await worker.fetch(request("/admin"), { ASSETS: fakeAssets } satisfies Env);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /id="root"/);
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
  assert.match(payload.releases[0].downloadUrl, /published\\/downloads/);
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

test("publish endpoint rejects an incorrect bearer token", async () => {
  const response = await worker.fetch(new Request("https://hendy-tool-releas.ngogiaidy56.workers.dev/api/v1/admin/publish", {
    method: "POST",
    headers: { Authorization: "Bearer wrong-token" },
    body: new FormData(),
  }), { RELEASE_PUBLISH_TOKEN: "correct-token", RELEASES_BUCKET: { async head() { return null; }, async get() { return null; }, async put() { return { size: 0 }; } } } satisfies Env);
  assert.equal(response.status, 401);
  const payload = await response.json() as { error: string };
  assert.equal(payload.error, "unauthorized");
});
