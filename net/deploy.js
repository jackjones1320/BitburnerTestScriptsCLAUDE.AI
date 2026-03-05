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

  // Launch hacknet daemon FIRST so its RAM is reserved before workers fill the host
  const me = ns.getHostname();
  if (!ns.ps(me).find(p => p.filename === "money/hacknet.js")) {
    ns.exec("money/hacknet.js", me, 1);
  }

  // Deploy on all hosts including home
  const hosts = ["home", ...rooted];
  for (const host of hosts) {
    deployOn(ns, host, target);
  }
}

/** Kill workers on this host that are targeting the wrong server or running the wrong script. */
function killWrongWorkers(ns, host, target, script) {
  for (const proc of ns.ps(host)) {
    if (WORKERS.includes(proc.filename) &&
        (proc.args[0] !== target || proc.filename !== script)) {
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

  // Kill workers targeting wrong server or running wrong script type
  killWrongWorkers(ns, host, target, script);

  // Don't re-launch if correct workers already running
  const running = ns.ps(host).find(
    p => p.filename === script && p.args[0] === target
  );
  if (running) return;

  const threads = maxThreads(ns, host, script);
  if (threads <= 0) return;

  ns.exec(script, host, threads, target);
}
