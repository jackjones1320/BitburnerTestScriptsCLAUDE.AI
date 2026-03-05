/**
 * git-pull.js
 *
 * Bootstrap script: pulls all project scripts from GitHub into Bitburner.
 * Run this whenever Claude pushes updates to the repo.
 *
 * Usage:
 *   run git-pull.js
 *
 * @param {NS} ns
 */
export async function main(ns) {
  // ============================================================
  // CONFIGURATION — update REPO_BASE to match your GitHub repo
  // ============================================================
  const GITHUB_USER = "jackjones1320";
  const GITHUB_REPO = "BitburnerTestScriptsCLAUDE.AI";
  const BRANCH = "main";

  const REPO_BASE = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}`;

  // ============================================================
  // FILE MANIFEST — every script Claude writes goes here
  // Add new files here as the project grows
  // ============================================================
  const FILES = [
    // Core
    "start.js",
    "git-pull.js",

    // Hack workers
    "hack/worker-hack.js",
    "hack/worker-grow.js",
    "hack/worker-weaken.js",
    "hack/batcher.js",

    // Network
    "net/crawler.js",
    "net/deploy.js",

    // Money
    "money/hacknet.js",
    "money/share.js",
    "money/servers.js",

    // Faction
    "faction/manager.js",
    "faction/augments.js",

    // Utils
    "utils/constants.js",
    "utils/helpers.js",

    // Singularity (unlocked later)
    "singularity/autopilot.js",
  ];

  // ============================================================
  // PULL
  // ============================================================
  ns.tprint("=== git-pull.js: starting sync from GitHub ===");
  ns.tprint(`Repo: ${REPO_BASE}`);

  let success = 0;
  let failed = 0;
  const errors = [];

  for (const file of FILES) {
    const url = `${REPO_BASE}/${file}`;
    const result = await ns.wget(url, file, "home");

    if (result) {
      ns.tprint(`  ✓ ${file}`);
      success++;
    } else {
      ns.tprint(`  ✗ FAILED: ${file}`);
      errors.push(file);
      failed++;
    }

    // Small delay to avoid hammering GitHub rate limits
    await ns.sleep(150);
  }

  ns.tprint("=== Sync complete ===");
  ns.tprint(`  Pulled:  ${success} files`);
  ns.tprint(`  Failed:  ${failed} files`);

  if (errors.length > 0) {
    ns.tprint("Failed files (may not exist yet — that's okay for future scripts):");
    for (const f of errors) {
      ns.tprint(`  - ${f}`);
    }
  }

  ns.tprint("");
  ns.tprint('Next step: run start.js');
  ns.tprint("  run start.js");
}
