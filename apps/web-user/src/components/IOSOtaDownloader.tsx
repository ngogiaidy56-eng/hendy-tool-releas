import React from "react";

/** OTA installation requires a signed, provisioned IPA and an HTTPS-hosted manifest. */
export function IOSOtaDownloader({ manifestUrl }: { manifestUrl?: string }) {
  if (!manifestUrl || !manifestUrl.startsWith("https://")) {
    return <p>iOS OTA is unavailable until a signed release manifest is configured.</p>;
  }
  return <a href={`itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`}>
    Install signed iOS app
  </a>;
}
