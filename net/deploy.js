/**
 * net/deploy.js
 * Copies worker scripts to every rooted server and launches threads
 * targeting the best available server. Also uses home's free RAM.
 *
 * Strategy: weaken → grow → hack ratio roughly 1:4:1 by thread count.
 * @param {NS} ns
 */
import { getAllServers, pickTarget, maxThreads } from "utils/helpers.js";
import { WORKER_HACK, WORKER_GROW, WORKER_WEAKEN } from "utils/constants.js";

const WORKERS = [WORKER_HACK, WORKER_GROW, WORKER_WEAKEN];

export async function main(ns) {
  ns.disableLog("ALL");

  const allServers = getAllServers(ns);
  const rooted = allServers.filter(h => ns.hasRootAccess(h));
  const target = pickTarget(ns, rooted);

  ns.tprint(`[deploy] Target: ${target}  |  Rooted servers: ${rooted.length}`);

  // Copy workers to every rooted server
  for (const host of rooted) {
    await ns.scp(WORKERS, host, "home");
  }

  // Deploy on all hosts including home
  const hosts = ["home", ...rooted];
  for (const host of hosts) {
    killStaleWorkers(ns, host, target);
    deployOn(ns, host, target);
  }
}

/** Kill workers on this host that are targeting a different server. */
function killStaleWorkers(ns, host, target) {
  for (const proc of ns.ps(host)) {
    if (WORKERS.includes(proc.filename) && proc.args[0] !== target) {
      ns.kill(proc.pid);
    }
  }
}

/** Launch weaken/grow/hack threads on a single host. */
function deployOn(ns, host, target) {
  const sec    = ns.getServerSecurityLevel(target);
  const minSec = ns.getServerMinSecurityLevel(target);
  const money  = ns.getServerMoneyAvailable(target);
  const maxMon = ns.getServerMaxMoney(target);

  // Decide mode: weaken → grow → hack
  let script;
  if (sec > minSec + 3) {
    script = WORKER_WEAKEN;
  } else if (money < maxMon * 0.75) {
    script = WORKER_GROW;
  } else {
    script = WORKER_HACK;
  }

  const threads = maxThreads(ns, host, script);
  if (threads <= 0) return;

  // Don't re-launch if already running with same args
  const running = ns.ps(host).find(
    p => p.filename === script && p.args[0] === target
  );
  if (running) return;

  ns.exec(script, host, threads, target);
}
