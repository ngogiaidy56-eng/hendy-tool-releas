const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") return json({ service: "hendy-backend-api", ok: true });
    if (url.pathname === "/api/v1/meta" && request.method === "GET") {
      return json({ service: "Hendy App Store API", version: "1.0.0", routes: ["/healthz", "/api/v1/releases"] });
    }
    if (url.pathname === "/api/v1/releases" && request.method === "GET") {
      if (!env.DB) return json({ error: "Database binding is not configured" }, 503);
      const { results } = await env.DB.prepare(
        "SELECT id, name, platform, version, artifact_key, sha256, created_at FROM releases WHERE published = 1 ORDER BY created_at DESC LIMIT 100"
      ).all();
      return json({ releases: results });
    }
    if (url.pathname.startsWith("/api/v1/admin/")) {
      // Fail closed until Cloudflare Access JWT validation is implemented/configured.
      if (!env.CF_ACCESS_AUD || !env.CF_ACCESS_TEAM_DOMAIN) return json({ error: "Admin API authorization is not configured" }, 503);
      return json({ error: "Admin endpoint not implemented" }, 501);
    }
    return json({ error: "Not found" }, 404);
  }
};
