/**
 * faction/augments.js
 * Returns the list of augmentations to prioritize buying, in order.
 * Focused on hacking multipliers for BN1 speedrun.
 */

// High-priority hacking augments by faction (rough priority order)
export const AUG_PRIORITY = [
  // CyberSec
  "Neurotrainer I",
  "BitWire",
  "Artificial Synaptic Potentiation",
  // NiteSec
  "Neurotrainer II",
  "CRTX42-AA Gene Modification",
  "Neural-Retention Enhancement",
  // The Black Hand
  "Neurotrainer III",
  "The Black Hand",
  // BitRunners
  "Cranial Signal Processors - Gen I",
  "Cranial Signal Processors - Gen II",
  "Cranial Signal Processors - Gen III",
  "Cranial Signal Processors - Gen IV",
  "Cranial Signal Processors - Gen V",
  "Neuralstimulator",
  "Neural Accelerator",
  "PCMatrix",
  // Daedalus
  "The Red Pill",
];

/**
 * Get all augments available from joined factions, sorted by priority.
 * @param {NS} ns
 * @returns {{ aug: string, faction: string, cost: number }[]}
 */
export function getAvailableAugments(ns) {
  const player = ns.getPlayer();
  const factions = player.factions;
  const owned = new Set(ns.singularity.getOwnedAugmentations(true));

  const available = [];
  for (const faction of factions) {
    const augs = ns.singularity.getAugmentationsFromFaction(faction);
    for (const aug of augs) {
      if (owned.has(aug)) continue;
      const cost = ns.singularity.getAugmentationPrice(aug);
      const rep  = ns.singularity.getAugmentationRepReq(aug);
      const factionRep = ns.singularity.getFactionRep(faction);
      if (factionRep >= rep) {
        available.push({ aug, faction, cost });
      }
    }
  }

  // Sort by priority list first, then by cost descending (buy expensive first)
  available.sort((a, b) => {
    const ai = AUG_PRIORITY.indexOf(a.aug);
    const bi = AUG_PRIORITY.indexOf(b.aug);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return b.cost - a.cost;
  });

  return available;
}
