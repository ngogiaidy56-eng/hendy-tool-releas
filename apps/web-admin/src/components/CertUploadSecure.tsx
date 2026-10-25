import React, { useState } from "react";

/** Upload certificate material to the protected API over HTTPS; never log or store it in localStorage. */
export function CertUploadSecure({ upload }: { upload: (file: File) => Promise<void> }) {
  const [status, setStatus] = useState("");
  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("Uploading to protected API…");
    try { await upload(file); setStatus("Upload accepted; check server-side validation status."); }
    catch { setStatus("Upload failed. No certificate contents were displayed."); }
    finally { event.target.value = ""; }
  }
  return <label>Upload signing certificate (P12/PFX/keystore)
    <input type="file" accept=".p12,.pfx,.jks,.keystore" onChange={onChange} />
    <p role="status">{status}</p>
  </label>;
}
