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
