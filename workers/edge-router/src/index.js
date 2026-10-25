export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") return Response.json({ service: "hendy-edge-router", ok: true });
    const host = url.hostname.toLowerCase();
    const destination = host.startsWith("admin.") ? env.ADMIN_PAGES_URL
      : host.startsWith("ops.") ? env.OPERATIONS_PAGES_URL : env.USER_PAGES_URL;
    if (!destination) return new Response("Page origin is not configured", { status: 503 });
    const target = new URL(url.pathname + url.search, destination);
    // Only configured HTTPS origins are allowed; never proxy arbitrary user-provided hosts.
    if (target.protocol !== "https:") return new Response("Invalid origin configuration", { status: 500 });
    return fetch(new Request(target, request));
  }
};
