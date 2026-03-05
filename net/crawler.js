/**
 * net/crawler.js
 * Discovers all servers in the network and roots every one it can.
 * Runs once and exits (call repeatedly from start.js).
 * @param {NS} ns
 */
import { getAllServers, tryRoot } from "utils/helpers.js";

export async function main(ns) {
  ns.disableLog("ALL");
  const servers = getAllServers(ns);
  let rooted = 0;

  for (const host of servers) {
    if (ns.hasRootAccess(host)) { rooted++; continue; }
    if (tryRoot(ns, host)) {
      ns.tprint(`[crawler] Rooted: ${host}`);
      rooted++;
    }
  }

  ns.tprint(`[crawler] ${rooted}/${servers.length} servers rooted.`);
}
