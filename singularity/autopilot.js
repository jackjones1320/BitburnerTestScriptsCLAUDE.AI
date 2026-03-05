/**
 * singularity/autopilot.js
 * Full automation loop using the Singularity API.
 * Handles faction joining, rep grinding, augment buying, and installing.
 * Also monitors for Daedalus eligibility and The Red Pill.
 *
 * Requires: SF4 or BN4+
 * @param {NS} ns
 */
import { getAllServers, tryRoot, fmtMoney } from "utils/helpers.js";

export async function main(ns) {
  ns.disableLog("ALL");

  if (!ns.singularity?.getOwnedAugmentations) {
    ns.tprint("[autopilot] Singularity API unavailable — skipping.");
    return;
  }

  ns.tprint("[autopilot] Full autopilot engaged.");

  while (true) {
    // 1. Create port programs if possible
    await createPrograms(ns);

    // 2. Root new servers
    rootAll(ns);

    // 3. Handle faction invites
    for (const f of ns.singularity.checkFactionInvitations()) {
      ns.singularity.joinFaction(f);
      ns.tprint(`[autopilot] Joined faction: ${f}`);
    }

    // 4. Work toward best available faction
    const workTarget = getBestFactionToWork(ns);
    if (workTarget) {
      ns.singularity.workForFaction(workTarget, "hacking", false);
    }

    // 5. Buy augments
    await buyAllAffordableAugs(ns);

    // 6. Check Daedalus / Red Pill
    if (await checkForWin(ns)) return;

    // 7. Install when enough augs queued
    const owned    = ns.singularity.getOwnedAugmentations(true).length;
    const installed = ns.singularity.getOwnedAugmentations(false).length;
    const queued   = owned - installed;
    if (queued >= 10 && !hasDaedalusRedPill(ns)) {
      ns.tprint(`[autopilot] Installing ${queued} augs — resetting...`);
      await ns.sleep(1000);
      ns.singularity.installAugmentations("start.js");
      return;
    }

    await ns.sleep(15000);
  }
}

function rootAll(ns) {
  for (const host of getAllServers(ns)) {
    tryRoot(ns, host);
  }
}

async function createPrograms(ns) {
  const programs = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
  ];
  for (const prog of programs) {
    if (!ns.fileExists(prog, "home")) {
      try { ns.singularity.createProgram(prog); } catch (_) {}
    }
  }
}

function getBestFactionToWork(ns) {
  const order = ["CyberSec", "NiteSec", "The Black Hand", "BitRunners", "Daedalus"];
  const player = ns.getPlayer();
  const owned = new Set(ns.singularity.getOwnedAugmentations(true));

  for (const faction of order) {
    if (!player.factions.includes(faction)) continue;
    const augs = ns.singularity.getAugmentationsFromFaction(faction);
    const needed = augs.filter(a => !owned.has(a));
    if (needed.length === 0) continue;
    const maxRep = Math.max(...needed.map(a => ns.singularity.getAugmentationRepReq(a)));
    if (ns.singularity.getFactionRep(faction) < maxRep) return faction;
  }
  return null;
}

async function buyAllAffordableAugs(ns) {
  const factionOrder = ["Daedalus", "BitRunners", "The Black Hand", "NiteSec", "CyberSec"];
  const player = ns.getPlayer();
  const owned = new Set(ns.singularity.getOwnedAugmentations(true));

  // Collect all available augs across factions
  const candidates = [];
  for (const faction of factionOrder) {
    if (!player.factions.includes(faction)) continue;
    const augs = ns.singularity.getAugmentationsFromFaction(faction);
    for (const aug of augs) {
      if (owned.has(aug)) continue;
      const rep  = ns.singularity.getAugmentationRepReq(aug);
      const cost = ns.singularity.getAugmentationPrice(aug);
      if (ns.singularity.getFactionRep(faction) >= rep) {
        candidates.push({ aug, faction, cost });
      }
    }
  }

  // Buy most expensive first
  candidates.sort((a, b) => b.cost - a.cost);
  for (const { aug, faction, cost } of candidates) {
    if (ns.getPlayer().money >= cost) {
      if (ns.singularity.purchaseAugmentation(faction, aug)) {
        ns.tprint(`[autopilot] Bought: ${aug} (${fmtMoney(cost)})`);
      }
    }
  }
}

function hasDaedalusRedPill(ns) {
  const owned = new Set(ns.singularity.getOwnedAugmentations(true));
  return owned.has("The Red Pill");
}

async function checkForWin(ns) {
  const player = ns.getPlayer();

  // Check if we have The Red Pill installed (not just queued)
  const installed = new Set(ns.singularity.getOwnedAugmentations(false));
  if (!installed.has("The Red Pill")) return false;

  // Hack w0r1d_d43m0n if accessible
  const allServers = getAllServers(ns);
  if (allServers.includes("w0r1d_d43m0n")) {
    if (!ns.hasRootAccess("w0r1d_d43m0n")) {
      tryRoot(ns, "w0r1d_d43m0n");
    }
    if (ns.hasRootAccess("w0r1d_d43m0n")) {
      ns.tprint("[autopilot] *** HACKING w0r1d_d43m0n — DESTROYING BITNODE ***");
      ns.singularity.connect("w0r1d_d43m0n");
      ns.singularity.hackcontinue();
      return true;
    }
  }
  return false;
}
