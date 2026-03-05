/**
 * money/servers.js — Purchased server buyer/upgrader daemon.
 *
 * Runs as a persistent daemon (loop). Buys new purchased servers and
 * upgrades existing ones when money allows. Separated from start.js so
 * that the expensive NS APIs (purchaseServer, upgradePurchasedServer)
 * don't inflate start.js RAM.
 *
 * @param {NS} ns
 */
import { PSERVER_PREFIX, PSERVER_MAX } from "utils/constants.js";

const LOOP_SLEEP = 60000; // Re-check every 60 seconds

export async function main(ns) {
  ns.disableLog("ALL");

  while (true) {
    const money = ns.getPlayer().money;
    const pservers = ns.getPurchasedServers();

    // Buy a new server if below the max and we can afford one
    if (pservers.length < PSERVER_MAX) {
      for (let ram = 32; ram <= 4096; ram *= 2) {
        const cost = ns.getPurchasedServerCost(ram);
        if (cost <= money * 0.1) {
          const name = `${PSERVER_PREFIX}${pservers.length}`;
          ns.purchaseServer(name, ram);
          ns.tprint(`[servers] Purchased: ${name} (${ram}GB) for $${(cost / 1e6).toFixed(2)}M`);
          break;
        }
      }
    }

    // Upgrade existing servers when we can afford double their current RAM
    for (const host of pservers) {
      const current = ns.getServerMaxRam(host);
      const next = current * 2;
      if (next > 1048576) continue; // 1 PB cap
      const cost = ns.getPurchasedServerUpgradeCost(host, next);
      if (cost <= money * 0.2) {
        ns.upgradePurchasedServer(host, next);
        ns.tprint(`[servers] Upgraded ${host}: ${current}→${next}GB`);
      }
    }

    await ns.sleep(LOOP_SLEEP);
  }
}
