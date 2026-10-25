import React from "react";

/** Link to authentically signed installers; never suppress or evade SmartScreen. */
export function WindowsSafeInstaller({ href, publisher }: { href?: string; publisher?: string }) {
  if (!href) return <p>No Windows installer has been published.</p>;
  return <section><a href={href} rel="noopener noreferrer" download>Download Windows installer</a>
    {publisher && <p>Publisher: {publisher}</p>}
    <p>Installers should be Authenticode-signed and distributed with a published SHA-256 checksum.</p>
  </section>;
}
