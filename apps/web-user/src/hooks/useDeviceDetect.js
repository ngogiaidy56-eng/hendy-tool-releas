export function useDeviceDetect() {
  if (typeof navigator === "undefined") return { platform: "unknown", isMobile: false };
  const ua = navigator.userAgent || "";
  const platform = /iPhone|iPad|iPod/i.test(ua) ? "ios"
    : /Android/i.test(ua) ? "android"
    : /Windows/i.test(ua) ? "windows"
    : /Macintosh|Mac OS X/i.test(ua) ? "macos" : "unknown";
  return { platform, isMobile: /ios|android/.test(platform), userAgent: ua };
}
