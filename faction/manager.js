/**
 * faction/manager.js
 * Manages faction joining, reputation grinding, and augmentation purchases.
 * Requires Singularity API (SF4 or BN4+). Runs as a daemon.
 *
 * Faction join order for BN1 Daedalus path:
 *   CyberSec → NiteSec → The Black Hand → BitRunners → Daedalus
 * @param {NS} ns
 */
import { getAvailableAugments } from "faction/augments.js";
import { fmtMoney } from "utils/helpers.js";

// Servers to backdoor to unlock factions
const BACKDOOR_TARGETS = {
  "CSEC":          "CyberSec",
  "avmnite-02h":   "NiteSec",
  "I.I.I.I":       "The Black Hand",
  "run4theh111z":  "BitRunners",
};

// Minimum rep needed before we install augments and reset
const INSTALL_THRESHOLD = 10; // number of augments queued

export async function main(ns) {
  ns.disableLog("ALL");

  if (!ns.singularity) {
    ns.tprint("[faction] ERROR: Singularity API not available. Need SF4 or BN4+.");
    return;
  }

  ns.tprint("[faction] Manager started.");

  while (true) {
    await joinEligibleFactions(ns);
    await workForRep(ns);
    await buyAugments(ns);
    await maybeInstall(ns);
    await ns.sleep(10000);
  }
}

async function joinEligibleFactions(ns) {
  const player = ns.getPlayer();
  const joined = new Set(player.factions);

  // Join any factions we've been invited to
  const invitations = ns.singularity.checkFactionInvitations();
  for (const faction of invitations) {
    if (!joined.has(faction)) {
      ns.singularity.joinFaction(faction);
      ns.tprint(`[faction] Joined: ${faction}`);
    }
  }
}

async function workForRep(ns) {
  const player = ns.getPlayer();
  const factionOrder = ["CyberSec", "NiteSec", "The Black Hand", "BitRunners", "Daedalus"];

  for (const faction of factionOrder) {
    if (!player.factions.includes(faction)) continue;

    const augs = ns.singularity.getAugmentationsFromFaction(faction);
    const owned = new Set(ns.singularity.getOwnedAugmentations(true));
    const unowned = augs.filter(a => !owned.has(a));
    if (unowned.length === 0) continue;

    // Work for this faction if we need rep
    const maxRepNeeded = Math.max(...unowned.map(a => ns.singularity.getAugmentationRepReq(a)));
    const currentRep = ns.singularity.getFactionRep(faction);

    if (currentRep < maxRepNeeded) {
      ns.singularity.workForFaction(faction, "hacking", false);
      return; // work for one faction at a time
    }
  }
}

async function buyAugments(ns) {
  const available = getAvailableAugments(ns);
  const money = ns.getPlayer().money;

  // Buy most expensive first to avoid price cascade issues
  const sorted = [...available].sort((a, b) => b.cost - a.cost);

  for (const { aug, faction, cost } of sorted) {
    if (cost <= money * 0.9) {
      const result = ns.singularity.purchaseAugmentation(faction, aug);
      if (result) {
        ns.tprint(`[faction] Purchased: ${aug} from ${faction} for ${fmtMoney(cost)}`);
      }
    }
  }
}

async function maybeInstall(ns) {
  const owned = ns.singularity.getOwnedAugmentations(true);
  const installed = ns.singularity.getOwnedAugmentations(false);
  const queued = owned.length - installed.length;

  if (queued >= INSTALL_THRESHOLD) {
    ns.tprint(`[faction] Installing ${queued} augmentations — soft reset incoming!`);
    await ns.sleep(2000);
    ns.singularity.installAugmentations("start.js");
  }
}
