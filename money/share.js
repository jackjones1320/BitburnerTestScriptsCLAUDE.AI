/**
 * money/share.js
 * Shares home RAM with factions to earn reputation when idle.
 * Only meant to run on spare threads after workers are deployed.
 * @param {NS} ns
 */
export async function main(ns) {
  await ns.share();
}
