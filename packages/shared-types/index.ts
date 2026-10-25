export type SupportedPlatform = "ios" | "android" | "windows" | "macos" | "linux";
export interface ReleaseRecord {
  id: string; name: string; platform: SupportedPlatform; version: string;
  artifact_key: string; sha256: string; created_at: string;
}
export interface ApiError { error: string; requestId?: string; }
export interface DeploymentStatus {
  component: string; status: "queued" | "running" | "succeeded" | "failed";
  updatedAt: string; details?: string;
}
