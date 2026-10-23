/**
 * Cloudflare Pages Functions - Edge API Gateway & Standalone Router
 * Hỗ trợ chạy trực tiếp trên Cloudflare Pages / Workers Edge hoặc chuyển tiếp (proxy) tới Render Backend nếu có BACKEND_ORIGIN.
 */

interface Env {
  BACKEND_ORIGIN?: string;
  ENVIRONMENT?: string;
}

interface Context {
  request: Request;
  env: Env;
  params: {
    path?: string[];
  };
}

export async function onRequest(context: Context): Promise<Response> {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const pathParts = Array.isArray(params.path) ? params.path : (params.path ? [params.path] : []);
  const subPath = pathParts.join('/');

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'X-Content-Type-Options': 'nosniff',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Nếu đã cấu hình BACKEND_ORIGIN và không phải là route standalone, proxy sang backend
  if (env.BACKEND_ORIGIN && !subPath.startsWith('edge-')) {
    try {
      const backend = new URL(env.BACKEND_ORIGIN);
      const target = new URL(backend.toString());
      target.pathname = url.pathname;
      target.search = url.search;

      const upstream = new Request(target.toString(), request);
      const response = await fetch(upstream);
      const respHeaders = new Headers(response.headers);
      respHeaders.set('Access-Control-Allow-Origin', '*');
      respHeaders.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: respHeaders,
      });
    } catch {
      // Tiếp tục xử lý fallback tại Edge nếu backend không phản hồi
    }
  }

  // --- Edge Native API Handlers ---

  // GET /api/health hoặc /api/v1/health
  if (subPath === 'health' || subPath === 'v1/health' || subPath === '') {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        service: 'Hendy Tools Cloudflare Pages Edge Gateway',
        runtime: 'Cloudflare Workers (V8)',
        timestamp: new Date().toISOString(),
        version: '3.1.2',
        airGapped: true,
      }),
      { status: 200, headers }
    );
  }

  // GET /api/releases
  if (subPath === 'releases' || subPath === 'v1/releases') {
    return new Response(
      JSON.stringify({
        success: true,
        provider: 'Cloudflare Pages & Workers Edge',
        releases: [
          {
            version: '3.1.2',
            platform: 'windows',
            channel: 'stable',
            fileName: 'HendyToolsPro-3.1.2-Setup.exe',
            sha256: '9f833a69a3b684cb3e0a2944b02927e163533446955a8f57297ff055f10667e8',
            size: 49283072,
            downloadUrl: '/api/v1/releases/download?platform=windows&channel=stable',
          },
          {
            version: '3.1.2',
            platform: 'android',
            channel: 'stable',
            fileName: 'HendyTools-3.1.2-arm64.apk',
            sha256: '4b29c9a6e11894a457008cf82f672ea34b3e34b92b0a96939e6df74e3da8f991',
            size: 28419072,
            downloadUrl: '/api/v1/releases/download?platform=android&channel=stable',
          },
        ],
      }),
      { status: 200, headers }
    );
  }

  // GET /api/telemetry
  if (subPath === 'telemetry' || subPath === 'v1/telemetry') {
    return new Response(
      JSON.stringify({
        cpuUsage: 26,
        ramUsage: 4.3,
        netDownMb: 3.4,
        netUpMb: 1.1,
        activeServices: 6,
        uptime: '24 ngày 12 giờ',
        edgeLocation: request.headers.get('cf-ipcountry') || 'VN',
      }),
      { status: 200, headers }
    );
  }

  // GET /api/v1/domains
  if (subPath === 'v1/domains' || subPath === 'domains') {
    return new Response(
      JSON.stringify({
        success: true,
        domains: [
          { domain: 'hendytools.pages.dev', target: 'download', provider: 'cloudflare-pages', status: 'active' },
          { domain: 'admin-hendytools.pages.dev', target: 'admin', provider: 'cloudflare-pages', status: 'active' },
          { domain: 'tai-ve.forgeos.vn', target: 'download', provider: 'cloudflare-workers', status: 'active' },
          { domain: 'quan-tri.forgeos.vn', target: 'studio', provider: 'cloudflare-workers', status: 'active' },
        ],
      }),
      { status: 200, headers }
    );
  }

  // Fallback endpoint
  return new Response(
    JSON.stringify({
      success: true,
      service: 'Hendy Tools Cloudflare Edge',
      route: subPath,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers }
  );
}
