import React, { useState } from "react";

const REQUIRED_SECRET_NAMES = [
  "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "GITHUB_TOKEN",
  "RELEASE_PUBLISH_TOKEN", "CF_ACCESS_TEAM_DOMAIN", "CF_ACCESS_AUD",
  "CF_ACCESS_ADMIN_EMAILS"
] as const;

/** Secret values are submitted directly to the authenticated API and are never persisted in browser storage. */
export function AutomationSecretsForm({ submit }: { submit: (values: Record<string, string>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("Submitting securely…");
    try { await submit(values); setValues({}); setStatus("Accepted by API. Check the audit log for final status."); }
    catch { setStatus("Submission failed. Verify authorization and server logs."); }
  }
  return <form onSubmit={onSubmit}>
    <h2>Deployment credentials</h2>
    <p>Only configure credentials in the authenticated API. Values are not stored by this page.</p>
    {REQUIRED_SECRET_NAMES.map(name => <label key={name} style={{display:"block",margin:"12px 0"}}>
      {name}<input type="password" autoComplete="new-password" value={values[name] ?? ""}
        onChange={e=>setValues(v=>({...v,[name]:e.target.value}))} style={{display:"block",width:"100%"}} />
    </label>)}
    <button type="submit">Submit credentials</button><p role="status">{status}</p>
  </form>;
}
