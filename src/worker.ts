/**
 * Hendy Tools frontend + public release API.
 *
 * Runtime: Cloudflare Workers with Static Assets.
 * The Worker named "hendy-tool-releas" serves the UI at:
 * https://hendy-tool-releas.ngogiaidy56.workers.dev/
 */

export interface AssetBinding {
  fetch(request: Request | string): Promise<Response>;
}

interface R2ObjectMetadata {
  size: number;
  etag?: string;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody extends R2ObjectMetadata {
  body: ReadableStream<Uint8Array>;
}

export interface ReleaseBucketBinding {
  head(key: string): Promise<R2ObjectMetadata | null>;
  get(key: string): Promise<R2ObjectBody | null>;
}

export interface Env {
  ASSETS?: AssetBinding;
  RELEASES_BUCKET?: ReleaseBucketBinding;
  ENVIRONMENT?: string;
  APP_NAME?: string;
  PUBLIC_BASE_URL?: string;
}

type ReleaseRecord = {
  version: string;
  build: number;
  platform: "windows" | "android";
  channel: "stable";
  fileName: string;
  objectKey: string;
  minSupportedVersion: string;
  releaseNotes: string;
};

const RELEASE_CATALOG: ReleaseRecord[] = [
  {
    version: "3.2.0",
    build: 30200,
    platform: "windows",
    channel: "stable",
    fileName: "HendyToolsPro-3.2.0-Setup.exe",
    objectKey: "windows/3.2.0/HendyToolsPro-3.2.0-Setup.exe",
    minSupportedVersion: "2.0.0",
    releaseNotes: "Bản ghi phát hành mẫu. Chỉ phân phối sau khi tải artifact đã build thật lên R2.",
  },
  {
    version: "3.2.0",
    build: 30200,
    platform: "android",
    channel: "stable",
    fileName: "HendyToolsMobile-3.2.0.apk",
    objectKey: "android/3.2.0/HendyToolsMobile-3.2.0.apk",
    minSupportedVersion: "2.0.0",
    releaseNotes: "Bản ghi phát hành mẫu. Chỉ phân phối sau khi tải artifact đã build thật lên R2.",
  },
];

function baseUrl(request: Request, env: Env): string {
  const configured = env.PUBLIC_BASE_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/$/, "");
}

function securityHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set("X-Content-Type-Options", "nosniff");
  result.set("X-Frame-Options", "SAMEORIGIN");
  result.set("Referrer-Policy", "strict-origin-when-cross-origin");
  result.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return result;
}

function json(data: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = securityHeaders(extra);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function sha256From(metadata: R2ObjectMetadata | null): string | null {
  const value = metadata?.customMetadata?.sha256?.toLowerCase();
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

function contentType(fileName: string, storedType?: string): string {
  if (storedType) return storedType;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".apk")) return "application/vnd.android.package-archive";
  if (lower.endsWith(".exe")) return "application/vnd.microsoft.portable-executable";
  if (lower.endsWith(".msi")) return "application/x-msi";
  if (lower.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

async function releasesResponse(request: Request, env: Env): Promise<Response> {
  const origin = baseUrl(request, env);
  const releases = await Promise.all(
    RELEASE_CATALOG.map(async (release) => {
      const metadata = env.RELEASES_BUCKET
        ? await env.RELEASES_BUCKET.head(release.objectKey)
        : null;
      const available = metadata !== null;
      const sha256 = sha256From(metadata);
      return {
        version: release.version,
        build: release.build,
        platform: release.platform,
        channel: release.channel,
        fileName: release.fileName,
        fileSizeBytes: metadata?.size ?? null,
        sha256,
        checksumVerified: sha256 !== null,
        available,
        publishedAt: metadata?.customMetadata?.publishedAt ?? null,
        minSupportedVersion: release.minSupportedVersion,
        releaseNotes: release.releaseNotes,
        downloadUrl: available
          ? `${origin}/api/v1/downloads/artifacts/${encodeURIComponent(release.fileName)}`
          : null,
      };
    })
  );

  return json({
    success: true,
    service: "Hendy Tools Release API",
    total: releases.length,
    available: releases.filter((release) => release.available).length,
    note: "Metadata mẫu chưa phải bằng chứng rằng gói cài đặt đã được phát hành.",
    releases,
  });
}

async function downloadRelease(request: Request, env: Env): Promise<Response> {
  if (!env.RELEASES_BUCKET) {
    return json({
      success: false,
      error: "release_storage_not_configured",
      message: "Worker chưa được gắn R2 bucket binding RELEASES_BUCKET.",
    }, 503);
  }

  const url = new URL(request.url);
  const artifactPrefix = "/api/v1/downloads/artifacts/";
  let release: ReleaseRecord | undefined;

  if (url.pathname.startsWith(artifactPrefix)) {
    let requestedFile = "";
    try {
      requestedFile = decodeURIComponent(url.pathname.slice(artifactPrefix.length));
    } catch {
      return json({ success: false, error: "invalid_artifact_name" }, 400);
    }
    release = RELEASE_CATALOG.find((candidate) => candidate.fileName === requestedFile);
  } else {
    const platform = url.searchParams.get("platform");
    const channel = url.searchParams.get("channel") || "stable";
    release = RELEASE_CATALOG.find(
      (candidate) => candidate.platform === platform && candidate.channel === channel
    );
  }

  if (!release) {
    return json({
      success: false,
      error: "release_not_found",
      message: "Không có bản phát hành tương ứng với nền tảng và kênh đã chọn.",
    }, 404);
  }

  const object = await env.RELEASES_BUCKET.get(release.objectKey);
  if (!object) {
    return json({
      success: false,
      error: "artifact_not_published",
      message: "Chưa tìm thấy file cài đặt thật trong R2. Hãy tải artifact vào đúng object key trước khi phát hành.",
      requiredObjectKey: release.objectKey,
    }, 404);
  }

  const headers = securityHeaders();
  headers.set("Content-Type", contentType(release.fileName, object.httpMetadata?.contentType));
  headers.set("Content-Disposition", `attachment; filename="${release.fileName}"`);
  headers.set("Content-Length", String(object.size));
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  const sha256 = sha256From(object);
  if (sha256) headers.set("X-Artifact-SHA256", sha256);

  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(object.body, { status: 200, headers });
}


async function manifestResponse(request: Request, env: Env): Promise<Response> {
  const origin = baseUrl(request, env);
  const artifactEntries = await Promise.all(
    RELEASE_CATALOG.map(async (release) => {
      const metadata = env.RELEASES_BUCKET
        ? await env.RELEASES_BUCKET.head(release.objectKey)
        : null;
      const sha256 = sha256From(metadata);
      const available = metadata !== null;
      return {
        id: `release-${release.platform}-${release.version}`,
        filename: release.fileName,
        version: release.version,
        platform: release.platform,
        format: release.fileName.slice(release.fileName.lastIndexOf(".")),
        arch: release.platform === "windows" ? "x86_64" : "arm64",
        sizeBytes: metadata?.size ?? null,
        sha256,
        url: available ? `${origin}/api/v1/downloads/artifacts/${encodeURIComponent(release.fileName)}` : null,
        uploadedAt: metadata?.customMetadata?.publishedAt ?? null,
        contentType: contentType(release.fileName, metadata?.httpMetadata?.contentType),
        available,
        verified: sha256 !== null,
      };
    })
  );
  return json({
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    repository: "https://github.com/ngogiaidy56-eng/hendy-tool-releas",
    app: {
      id: "hendy-tools-pro",
      name: "Hendy Tools Pro",
      slug: "hendy-tools",
      latestVersion: "3.2.0",
      publisher: "Hendy Tools",
    },
    totalArtifacts: artifactEntries.length,
    artifacts: artifactEntries,
    note: "Các artifact chỉ được coi là đã phát hành khi tồn tại trong R2.",
  });
}

async function routeApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const isGet = method === "GET" || method === "HEAD";

  if (path === "/health" || path === "/healthz" || path === "/api/health" || path === "/api/v1/health") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const cf = request as Request & { cf?: { colo?: string; country?: string } };
    return json({
      status: "healthy",
      service: env.APP_NAME || "Hendy Tools Platform & App Downloader",
      runtime: "cloudflare-workers",
      environment: env.ENVIRONMENT || "production",
      timestamp: new Date().toISOString(),
      edge: { colo: cf.cf?.colo ?? null, country: cf.cf?.country ?? null },
      frontend: baseUrl(request, env),
      endpoints: ["/api/v1/meta", "/api/v1/releases", "/api/v1/update-check", "/api/v1/domains"],
    });
  }

  if (path === "/api" || path === "/api/meta" || path === "/api/v1/meta") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return json({
      service: env.APP_NAME || "Hendy Tools Platform & App Downloader",
      version: "3.2.0",
      environment: env.ENVIRONMENT || "production",
      frontend: baseUrl(request, env),
      health: "/healthz",
      api: {
        releases: "/api/v1/releases",
        updateCheck: "/api/v1/update-check",
        domains: "/api/v1/domains",
        telemetry: "/api/v1/telemetry",
      },
      releaseStorage: env.RELEASES_BUCKET ? "r2-bound" : "not-configured",
    });
  }

  if (path === "/api/releases" || path === "/api/v1/releases") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return releasesResponse(request, env);
  }

  if (path === "/api/v1/public/manifest.json" || path === "/api/v1/admin/manifest.json" || path === "/api/v1/manifest.json") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    return manifestResponse(request, env);
  }

  if (path === "/api/releases/download" || path === "/api/v1/releases/download" || path.startsWith("/api/v1/downloads/artifacts/")) {
    if (method !== "GET" && method !== "HEAD") {
      return json({ success: false, error: "method_not_allowed" }, 405);
    }
    return downloadRelease(request, env);
  }

  if (path === "/api/update-check" || path === "/api/v1/update-check") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const platform = url.searchParams.get("platform") || "windows";
    const channel = url.searchParams.get("channel") || "stable";
    const clientBuild = Number(url.searchParams.get("clientBuild") || 0);
    const release = RELEASE_CATALOG.find(
      (candidate) => candidate.platform === platform && candidate.channel === channel
    );
    if (!release) {
      return json({ updateAvailable: false, message: "Không tìm thấy kênh phát hành phù hợp." }, 404);
    }

    const metadata = env.RELEASES_BUCKET
      ? await env.RELEASES_BUCKET.head(release.objectKey)
      : null;
    const available = metadata !== null;
    return json({
      appId: "hendy-tools-pro",
      platform: release.platform,
      channel: release.channel,
      latestVersion: release.version,
      latestBuild: release.build,
      updateAvailable: available && release.build > clientBuild,
      available,
      mandatory: false,
      minSupportedVersion: release.minSupportedVersion,
      releaseNotes: release.releaseNotes,
      fileName: release.fileName,
      fileSizeBytes: metadata?.size ?? null,
      sha256: sha256From(metadata),
      downloadUrl: available
        ? `${baseUrl(request, env)}/api/v1/downloads/artifacts/${encodeURIComponent(release.fileName)}`
        : null,
    });
  }

  if (path === "/api/domains" || path === "/api/v1/domains") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const origin = baseUrl(request, env);
    return json({
      success: true,
      domains: [
        { domain: new URL(origin).host, provider: "cloudflare-workers", targetInterface: "store", primary: true },
        { domain: "hendy-tool-releas.pages.dev", provider: "cloudflare-pages", targetInterface: "store", primary: false },
      ],
      note: "Danh sách domain mục tiêu; hãy kiểm tra trạng thái thực trong Cloudflare Dashboard.",
    });
  }

  if (path === "/api/telemetry" || path === "/api/v1/telemetry") {
    if (!isGet) return json({ success: false, error: "method_not_allowed" }, 405);
    const cf = request as Request & { cf?: { colo?: string; country?: string; asn?: number; tlsVersion?: string } };
    return json({
      success: true,
      runtime: "cloudflare-workers",
      edgeLocation: cf.cf?.colo ?? null,
      country: cf.cf?.country ?? null,
      asn: cf.cf?.asn ?? null,
      tlsVersion: cf.cf?.tlsVersion ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  if (path.startsWith("/api/")) {
    return json({ success: false, error: "api_route_not_found", path }, 404);
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      const headers = securityHeaders();
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      headers.set("Access-Control-Max-Age", "86400");
      return new Response(null, { status: 204, headers });
    }

    try {
      const apiResponse = await routeApi(request, env);
      if (apiResponse) return apiResponse;

      if (!env.ASSETS) {
        return json({
          success: false,
          error: "static_assets_not_configured",
          message: "Static Assets binding ASSETS chưa được cấu hình trong wrangler.worker.toml.",
        }, 503);
      }

      let response = await env.ASSETS.fetch(request);
      if (response.status === 404 && (method === "GET" || method === "HEAD") && !url.pathname.includes(".")) {
        response = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
      }

      const headers = securityHeaders(response.headers);
      if (url.pathname.startsWith("/assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
      } else if (url.pathname === "/" || url.pathname.endsWith(".html")) {
        headers.set("Cache-Control", "no-cache");
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error("Hendy Worker request failed", error);
      return json({
        success: false,
        error: "internal_error",
        message: "Đã xảy ra lỗi trong Worker. Kiểm tra Cloudflare Workers Logs để biết chi tiết.",
      }, 500);
    }
  },
};
