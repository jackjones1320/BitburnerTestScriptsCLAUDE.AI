/**
 * net/crawler.js
 * Discovers all servers in the network, roots every one it can,
 * and copies essential scripts to each rooted server so they can
 * host deploy.js, workers, and hacknet.
 *
 * Runs once and exits (re-exec'd every 30 s from start.js).
 * @param {NS} ns
 */
import { getAllServers, tryRoot } from "utils/helpers.js";

/** Scripts to seed onto every rooted server. */
const SEED = [
  "net/deploy.js",
  "utils/helpers.js",
  "utils/constants.js",
  "hack/worker-hack.js",
  "hack/worker-grow.js",
  "hack/worker-weaken.js",
  "money/hacknet.js",
];

export async function main(ns) {
  ns.disableLog("ALL");
  const servers = getAllServers(ns);
  let rooted = 0;

  for (const host of servers) {
    const wasRooted = ns.hasRootAccess(host);
    if (!wasRooted && !tryRoot(ns, host)) continue;
    if (!wasRooted) ns.tprint(`[crawler] Rooted: ${host}`);
    rooted++;
    // Seed scripts so this server can host deploy.js / workers
    await ns.scp(SEED, host, "home");
  }

  ns.tprint(`[crawler] ${rooted}/${servers.length} servers rooted.`);
}
