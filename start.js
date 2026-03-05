/**
 * start.js — Lean orchestrator (~3.15 GB RAM).
 *
 * Responsibilities:
 *  1. Run net/crawler.js on home to root servers and seed scripts.
 *  2. Run net/deploy.js on the best rooted external server (foodnstuff
 *     has 16 GB, far more than the ~5.5 GB deploy.js needs).
 *
 * Everything else (hacknet, faction, autopilot) is launched by deploy.js
 * on the external host once it has room.
 *
 * RAM budget (8 GB home):
 *   start.js  ~3.15 GB  (exec 1.3 + ps 0.2 + hasRootAccess 0.05 + base 1.6)
 *   Free       ~4.85 GB  → enough for crawler (~3.8 GB, transient)
 *
 * @param {NS} ns
 */
const LOOP_SLEEP = 30_000;

export async function main(ns) {
  ns.disableLog("ALL");
  ns.tprint("=== start.js: Bitburner Automation Engaged ===");

  let seeded = false;

  while (true) {
    // 1. Root servers and seed scripts to them
    if (!ns.ps("home").find(p => p.filename === "net/crawler.js")) {
      ns.exec("net/crawler.js", "home", 1);
      if (!seeded) {
        // First run: wait for crawler to finish copying files before continuing
        await ns.sleep(8000);
        seeded = true;
      }
    }

    // 2. Run deploy.js on the best rooted external server
    const dHost = findDeployHost(ns);
    if (dHost) {
      if (!ns.ps(dHost).find(p => p.filename === "net/deploy.js")) {
        ns.exec("net/deploy.js", dHost, 1);
      }
    }

    ns.tprint(`[start] deploy host: ${dHost ?? "waiting for rooted server..."}`);
    await ns.sleep(LOOP_SLEEP);
  }
}

/**
 * Find the first rooted server with enough RAM to host deploy.js.
 * Ordered by preference (most RAM first).
 */
function findDeployHost(ns) {
  const candidates = [
    "foodnstuff", "joesguns", "harakiri-sushi", "hong-fang-tea",
    "nectar-net", "sigma-cosmetics", "phantasy", "n00dles",
  ];
  for (const h of candidates) {
    if (ns.hasRootAccess(h)) return h;
  }
  return null;
}
