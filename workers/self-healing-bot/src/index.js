export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") {
      return Response.json({ service: "hendy-self-healing-bot", ok: true });
    }
    // Alert-only by default: AI-generated patches must never be applied to production automatically.
    if (request.method === "POST" && url.pathname === "/webhook") {
      const secret = env.WEBHOOK_SECRET;
      if (!secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });
      const supplied = request.headers.get("Authorization") || "";
      if (supplied !== `Bearer ${secret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
      const payload = await request.json().catch(() => null);
      if (!payload || typeof payload !== "object") return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
      console.log(JSON.stringify({ event: "incident_received", kind: String(payload.kind || "unknown").slice(0, 80), action: "alert_only" }));
      return Response.json({ accepted: true, mode: "alert-only", message: "Review and approve remediation before applying changes." }, { status: 202 });
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  }
};
