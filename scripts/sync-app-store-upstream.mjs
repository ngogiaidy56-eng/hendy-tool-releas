import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";

const repository = "https://github.com/ngogiaidy56-eng/hendy-server-app-store.git";
const branch = "main";
const targetDir = resolve("integrations/hendy-server-app-store");
const tempRoot = mkdtempSafe();
const sourceDir = join(tempRoot, "source");

function mkdtempSafe() {
  const root = join(tmpdir(), "hendy-app-store-sync-" + process.pid + "-" + Date.now());
  mkdirSync(root, { recursive: true });
  return root;
}

const ignoredDirectories = new Set([
  ".git", ".aistudio", "node_modules", "dist", "coverage", ".wrangler",
  ".next", ".output", "build", "target"
]);
const ignoredExtensions = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|apk|exe|zip|pdf|dmg|ipa)$/i;

function shouldCopy(path) {
  const rel = relative(sourceDir, path).replace(/\\/g, "/");
  if (!rel || rel === ".") return true;
  const segments = rel.split("/");
  if (segments.some((segment) => ignoredDirectories.has(segment))) return false;
  if (rel === "firebase-applet-config.json") return false;
  if (segments.some((segment) => segment === ".env" || (segment.startsWith(".env.") && segment !== ".env.example"))) return false;
  if (ignoredExtensions.test(rel)) return false;
  return true;
}

function countFiles(root) {
  let count = 0;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) count += countFiles(path);
    else if (entry.isFile()) count++;
  }
  return count;
}

try {
  console.log("Cloning upstream " + repository + " (" + branch + ")...");
  execFileSync("git", ["clone", "--depth", "1", "--branch", branch, repository, sourceDir], { stdio: "inherit" });
  const upstreamCommit = execFileSync("git", ["-C", sourceDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const upstreamBranch = execFileSync("git", ["-C", sourceDir, "branch", "--show-current"], { encoding: "utf8" }).trim();

  const stageDir = join(tempRoot, "snapshot");
  cpSync(sourceDir, stageDir, { recursive: true, filter: shouldCopy });
  writeFileSync(join(stageDir, "UPSTREAM.json"), JSON.stringify({
    repository,
    branch: upstreamBranch || branch,
    commit: upstreamCommit,
    syncedAt: new Date().toISOString(),
    policy: {
      excluded: [".git", ".aistudio generated media", "node_modules", "dist/build output", "binary installers/media", "firebase-applet-config.json", "real .env files"],
      retained: [".env.example", "application source", "Pages Functions", "D1 migrations", "workflows as inert nested reference files"]
    }
  }, null, 2) + "\n", "utf8");

  mkdirSync(dirname(targetDir), { recursive: true });
  const backupDir = targetDir + ".sync-backup";
  rmSync(backupDir, { recursive: true, force: true });
  if (existsSync(targetDir)) {
    // Preserve the previous source snapshot so a failed swap can be rolled back.
    const { renameSync } = await import("node:fs");
    renameSync(targetDir, backupDir);
  }
  try {
    const { renameSync } = await import("node:fs");
    renameSync(stageDir, targetDir);
    rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    if (existsSync(backupDir) && !existsSync(targetDir)) {
      const { renameSync } = await import("node:fs");
      renameSync(backupDir, targetDir);
    }
    throw error;
  }

  console.log(JSON.stringify({
    success: true,
    source: repository,
    branch: upstreamBranch || branch,
    commit: upstreamCommit,
    files: countFiles(targetDir),
    target: "integrations/hendy-server-app-store",
    note: "Upstream Pages Functions remain an isolated snapshot; the root Worker and three Pages deployment contract is preserved."
  }, null, 2));
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
