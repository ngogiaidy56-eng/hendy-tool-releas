import React from "react";

/** Publish only verified APK artifacts. Do not attempt to bypass Android security checks. */
export function AndroidDirectLink({ href, sha256 }: { href: string; sha256?: string }) {
  if (!href) return <p>No verified Android release is available yet.</p>;
  return <section aria-label="Android release">
    <a href={href} rel="noopener noreferrer" download>Download verified APK</a>
    {sha256 && <p>SHA-256: <code>{sha256}</code></p>}
    <p>Install only if you trust the publisher. Android Play Protect may show its standard safety checks.</p>
  </section>;
}
