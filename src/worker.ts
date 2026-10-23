/**
 * Cloudflare Worker Entry Point for Hendy Tools Platform
 * Deploys on Cloudflare Workers / Cloudflare Pages Functions
 */

export interface Env {
  ASSETS?: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  ENVIRONMENT?: string;
  APP_NAME?: string;
  RELEASE_STORAGE_BUCKET?: string;
}

const DEFAULT_RELEASES = [
  {
    version: '3.2.0',
    build: 30200,
    platform: 'windows',
    channel: 'stable',
    releaseDate: '2026-10-18T10:00:00Z',
    fileSize: 49492800,
    downloadUrl: 'https://releases.hendytools.com/windows/HendyToolsPro-3.2.0-Setup.exe',
    sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: 'Cập nhật hệ thống giao diện độc lập, nâng cấp hiệu năng engine kết nối và bảo mật SHA-256.',
  },
  {
    version: '3.2.0',
    build: 30200,
    platform: 'android',
    channel: 'stable',
    releaseDate: '2026-10-18T10:00:00Z',
    fileSize: 25165824,
    downloadUrl: 'https://releases.hendytools.com/android/HendyToolsMobile-3.2.0.apk',
    sha256: '8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: 'Tối ưu hóa chạy nền trên Android 15+, hỗ trợ kiểm tra tính toàn vẹn gói cài đặt.',
  },
  {
    version: '3.1.5',
    build: 30150,
    platform: 'ios',
    channel: 'beta',
    releaseDate: '2026-10-14T08:30:00Z',
    fileSize: 31457280,
    downloadUrl: 'https://testflight.apple.com/join/hendytools',
    sha256: '7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d',
    mandatory: false,
    minSupportedVersion: '2.0.0',
    releaseNotes: 'Bản thử nghiệm TestFlight bổ sung hỗ trợ quản lý khóa API và giao diện Dark Mode tương thích iOS 19.',
  },
];

const DEFAULT_DOMAINS = [
  {
    domain: 'hendytools.pages.dev',
    provider: 'cloudflare-pages',
    targetInterface: 'portal',
    status: 'active',
    primary: true,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'Root and wildcard traffic routes directly to Public Download Center',
  },
  {
    domain: 'admin-hendytools.pages.dev',
    provider: 'cloudflare-pages',
    targetInterface: 'admin',
    status: 'active',
    primary: false,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'Hostname prefix admin-* routes automatically to Server Management Panel Plus',
  },
  {
    domain: 'hendy-admin.onrender.com',
    provider: 'render',
    targetInterface: 'admin',
    status: 'active',
    primary: false,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'Render Web Service deployment dedicated to Administrator workstation',
  },
  {
    domain: 'ngogiaidy3.github.io',
    provider: 'github-pages',
    targetInterface: 'portal',
    status: 'active',
    primary: false,
    sslStatus: 'active',
    lastVerified: '2026-10-19T10:00:00Z',
    routingRule: 'GitHub Pages deployment routed to Public Download Center',
  },
];

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // 1. Health check
    if (pathname === '/health' || pathname === '/api/health') {
      return jsonResponse({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Hendy Tools Cloudflare Edge Worker',
        platform: 'cloudflare-workers',
        environment: env.ENVIRONMENT || 'production',
        cfColo: (request as any).cf?.colo || 'EDGE',
        country: (request as any).cf?.country || 'GLOBAL',
      });
    }

    // 2. Releases API
    if (pathname === '/api/releases') {
      return jsonResponse({
        success: true,
        total: DEFAULT_RELEASES.length,
        releases: DEFAULT_RELEASES,
      });
    }

    // 3. Update Check API
    if (pathname === '/api/update-check') {
      const platform = searchParams.get('platform') || 'windows';
      const channel = searchParams.get('channel') || 'stable';
      const clientBuild = Number(searchParams.get('clientBuild') || 0);

      const match = DEFAULT_RELEASES.find(
        (r) => r.platform === platform && (channel === 'all' || r.channel === channel)
      );

      if (!match) {
        return jsonResponse({
          updateAvailable: false,
          message: 'Không tìm thấy phiên bản phù hợp.',
        });
      }

      return jsonResponse({
        updateAvailable: match.build > clientBuild,
        latestVersion: match.version,
        latestBuild: match.build,
        downloadUrl: match.downloadUrl,
        sha256: match.sha256,
        mandatory: match.mandatory,
        minSupportedVersion: match.minSupportedVersion,
        releaseNotes: match.releaseNotes,
        publishedAt: match.releaseDate,
      });
    }

    // 4. Domains API
    if (pathname === '/api/domains') {
      return jsonResponse({
        success: true,
        domains: DEFAULT_DOMAINS,
      });
    }

    // 5. Telemetry API
    if (pathname === '/api/telemetry') {
      return jsonResponse({
        success: true,
        platform: 'cloudflare-edge',
        edgePop: (request as any).cf?.colo || 'EDGE-CLUSTER',
        cacheStatus: 'HIT',
        asn: (request as any).cf?.asn || 13335,
        tlsVersion: (request as any).cf?.tlsVersion || 'TLSv1.3',
      });
    }

    // 6. Test Webhook
    if (pathname === '/api/webhook/test' && request.method === 'POST') {
      let body = {};
      try {
        body = await request.json();
      } catch {
        // ignore JSON parse error
      }
      return jsonResponse({
        success: true,
        message: 'Webhook processed by Cloudflare Edge Worker',
        payload: body,
        timestamp: new Date().toISOString(),
      });
    }

    // Static Asset Delivery via Cloudflare Assets binding if available
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && request.method === 'GET') {
        // SPA rewrite: Serve index.html for client-side routing
        const indexRequest = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(indexRequest);
      }
      return response;
    }

    return new Response('Not Found', { status: 404 });
  },
};
