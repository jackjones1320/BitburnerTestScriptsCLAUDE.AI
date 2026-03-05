/**
 * money/hacknet.js
 * Buys and upgrades hacknet nodes to generate passive income.
 * Runs as a background daemon. Stops spending when money is tight.
 * @param {NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  // Don't spend more than this fraction of current money on hacknet
  const SPEND_RATIO = 0.25;
  // Stop upgrading past this level to avoid diminishing returns early on
  const MAX_LEVEL = 100;
  const MAX_RAM   = 16; // GB exponent: 2^4 = 16 GB
  const MAX_CORES = 4;
  const MAX_NODES = 12;

  ns.tprint("[hacknet] Daemon started.");

  while (true) {
    const budget = ns.getPlayer().money * SPEND_RATIO;
    const numNodes = ns.hacknet.numNodes();

    // Buy a new node if cheap enough
    if (numNodes < MAX_NODES) {
      const cost = ns.hacknet.getPurchaseNodeCost();
      if (cost <= budget) {
        ns.hacknet.purchaseNode();
        await ns.sleep(200);
        continue;
      }
    }

    // Upgrade existing nodes (level → ram → cores priority)
    let upgraded = false;
    for (let i = 0; i < numNodes; i++) {
      const stats = ns.hacknet.getNodeStats(i);

      if (stats.level < MAX_LEVEL) {
        const cost = ns.hacknet.getLevelUpgradeCost(i, 1);
        if (cost <= budget) { ns.hacknet.upgradeLevel(i, 1); upgraded = true; break; }
      }
      if (stats.ram < Math.pow(2, MAX_RAM)) {
        const cost = ns.hacknet.getRamUpgradeCost(i, 1);
        if (cost <= budget) { ns.hacknet.upgradeRam(i, 1); upgraded = true; break; }
      }
      if (stats.cores < MAX_CORES) {
        const cost = ns.hacknet.getCoreUpgradeCost(i, 1);
        if (cost <= budget) { ns.hacknet.upgradeCore(i, 1); upgraded = true; break; }
      }
    }

    await ns.sleep(upgraded ? 500 : 5000);
  }
}
