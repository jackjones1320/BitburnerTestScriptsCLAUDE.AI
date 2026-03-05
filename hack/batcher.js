/**
 * hack/batcher.js
 * HWGW batch scheduler. Runs timed Hack→Weaken→Grow→Weaken batches
 * that land in the correct order, keeping the target at min security
 * and max money between batches.
 *
 * Only used in mid/late game when RAM is sufficient (>= 128 GB total).
 * Args: [target]
 * @param {NS} ns
 */
import { maxThreads } from "utils/helpers.js";
import { WORKER_HACK, WORKER_GROW, WORKER_WEAKEN } from "utils/constants.js";

const BATCH_OFFSET = 50; // ms between each operation landing

export async function main(ns) {
  ns.disableLog("ALL");
  const target = ns.args[0];
  if (!target) { ns.tprint("[batcher] ERROR: no target specified"); return; }

  ns.tprint(`[batcher] Starting HWGW batches on ${target}`);

  while (true) {
    // Prep phase: get server to min security + max money before batching
    await prep(ns, target);
    await runBatch(ns, target);
    await ns.sleep(200);
  }
}

async function prep(ns, target) {
  while (true) {
    const sec    = ns.getServerSecurityLevel(target);
    const minSec = ns.getServerMinSecurityLevel(target);
    const money  = ns.getServerMoneyAvailable(target);
    const maxMon = ns.getServerMaxMoney(target);

    if (sec <= minSec + 0.05 && money >= maxMon * 0.999) break;

    if (sec > minSec + 0.05) {
      const threads = calcWeakenThreads(ns, sec - minSec);
      if (threads > 0) ns.exec(WORKER_WEAKEN, "home", threads, target);
    } else if (money < maxMon * 0.999) {
      const threads = Math.max(1, maxThreads(ns, "home", WORKER_GROW));
      if (threads > 0) ns.exec(WORKER_GROW, "home", threads, target);
    }

    await ns.sleep(Math.max(ns.getWeakenTime(target), ns.getGrowTime(target)) + 500);
  }
}

async function runBatch(ns, target) {
  const hackTime   = ns.getHackTime(target);
  const weakTime   = ns.getWeakenTime(target);
  const growTime   = ns.getGrowTime(target);

  // Threads — conservative estimates
  const hackThreads    = Math.max(1, Math.floor(maxThreads(ns, "home", WORKER_HACK)   * 0.1));
  const weaken1Threads = calcWeakenThreads(ns, ns.hackAnalyzeSecurity(hackThreads, target));
  const growThreads    = Math.max(1, Math.floor(maxThreads(ns, "home", WORKER_GROW)   * 0.5));
  const weaken2Threads = calcWeakenThreads(ns, ns.growthAnalyzeSecurity(growThreads, target));

  if (hackThreads <= 0 || weaken1Threads <= 0 || growThreads <= 0 || weaken2Threads <= 0) {
    await ns.sleep(1000);
    return;
  }

  // Schedule so each lands BATCH_OFFSET ms apart: H → W1 → G → W2
  const now = Date.now();
  const hackStart   = weakTime - hackTime   - BATCH_OFFSET;
  const weaken1Start = 0;
  const growStart   = weakTime - growTime   + BATCH_OFFSET;
  const weaken2Start = BATCH_OFFSET * 2;

  const delay = (ms) => ns.sleep(Math.max(0, ms));

  // Launch all four with offsets
  const batchId = Math.floor(Math.random() * 1e6);
  ns.exec(WORKER_HACK,   "home", hackThreads,    target);
  await delay(Math.max(0, weaken1Start - hackStart));
  ns.exec(WORKER_WEAKEN, "home", weaken1Threads, target);
  await delay(Math.max(0, growStart - weaken1Start));
  ns.exec(WORKER_GROW,   "home", growThreads,    target);
  await delay(Math.max(0, weaken2Start - growStart));
  ns.exec(WORKER_WEAKEN, "home", weaken2Threads, target);

  // Wait for the batch to complete
  await ns.sleep(weakTime + BATCH_OFFSET * 3 + 500);
}

/** Calculate weaken threads needed to reduce security by `amount`. */
function calcWeakenThreads(ns, amount) {
  if (amount <= 0) return 1;
  return Math.ceil(amount / ns.weakenAnalyze(1));
}
