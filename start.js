/**
 * start.js — Main entry point for Bitburner automation.
 *
 * Orchestrates the full BN1 strategy:
 *   1. Root all accessible servers (crawler)
 *   2. Deploy workers across all servers (deploy)
 *   3. Buy/upgrade hacknet nodes (hacknet daemon)
 *   4. Buy RAM and purchased servers as money grows
 *   5. Upgrade home RAM
 *   6. Launch faction manager when Singularity is available
 *   7. Upgrade to HWGW batcher when RAM allows
 *
 * Re-runs every loop to adapt to game state.
 * @param {NS} ns
 */
import { getAllServers, tryRoot, pickTarget, maxThreads, fmtMoney } from "utils/helpers.js";
import { PSERVER_PREFIX, PSERVER_MAX, WORKER_HACK, WORKER_GROW, WORKER_WEAKEN } from "utils/constants.js";

const LOOP_SLEEP = 30000; // 30 seconds between main iterations

export async function main(ns) {
  ns.disableLog("ALL");
  ns.tprint("=== start.js: Bitburner Automation Engaged ===");

  // Kill any orphaned workers from previous runs
  cleanupOldWorkers(ns);

  // Start persistent daemons (only if not already running)
  startDaemon(ns, "money/hacknet.js", []);

  while (true) {
    // Step 1: Root everything we can
    rootAllServers(ns);

    // Step 2: Buy/upgrade purchased servers
    managePurchasedServers(ns);

    // Step 3: Re-deploy workers across all rooted servers
    runDeploy(ns);

    // Step 4: Start faction manager if Singularity is available
    maybeStartSingularity(ns);

    // Step 5: Status report
    printStatus(ns);

    await ns.sleep(LOOP_SLEEP);
  }
}

function rootAllServers(ns) {
  const all = getAllServers(ns);
  for (const host of all) tryRoot(ns, host);
}

function runDeploy(ns) {
  // Kill previous deploy run and re-run fresh
  const existing = ns.ps("home").find(p => p.filename === "net/deploy.js");
  if (!existing) {
    ns.exec("net/deploy.js", "home", 1);
  }
}

function managePurchasedServers(ns) {
  const money = ns.getPlayer().money;
  const pservers = ns.getPurchasedServers();

  // Buy new servers if we have fewer than max and can afford them
  if (pservers.length < PSERVER_MAX) {
    // Start small: 32 GB = cheapest useful size
    for (let ram = 32; ram <= 4096; ram *= 2) {
      const cost = ns.getPurchasedServerCost(ram);
      if (cost <= money * 0.1) {
        const name = `${PSERVER_PREFIX}${pservers.length}`;
        ns.purchaseServer(name, ram);
        ns.tprint(`[start] Purchased server: ${name} (${ram} GB) for ${fmtMoney(cost)}`);
        break;
      }
    }
  }

  // Upgrade existing servers if we can afford double their current RAM
  for (const host of pservers) {
    const current = ns.getServerMaxRam(host);
    const next = current * 2;
    if (next > 1048576) continue; // 1 PB max
    const cost = ns.getPurchasedServerUpgradeCost(host, next);
    if (cost <= money * 0.2) {
      ns.upgradePurchasedServer(host, next);
      ns.tprint(`[start] Upgraded ${host}: ${current}→${next} GB`);
    }
  }
}

function maybeStartSingularity(ns) {
  // Try to start faction manager — it will self-exit if Singularity unavailable
  const running = ns.ps("home").find(p => p.filename === "faction/manager.js");
  if (!running) {
    ns.exec("faction/manager.js", "home", 1);
  }

  // Also try autopilot
  const autopilot = ns.ps("home").find(p => p.filename === "singularity/autopilot.js");
  if (!autopilot) {
    ns.exec("singularity/autopilot.js", "home", 1);
  }
}

function startDaemon(ns, script, args) {
  const running = ns.ps("home").find(p => p.filename === script);
  if (!running) {
    const ram = ns.getScriptRam(script, "home");
    const free = ns.getServerMaxRam("home") - ns.getServerUsedRam("home");
    if (free >= ram) {
      ns.exec(script, "home", 1, ...args);
    }
  }
}

function cleanupOldWorkers(ns) {
  const workers = [WORKER_HACK, WORKER_GROW, WORKER_WEAKEN];
  for (const proc of ns.ps("home")) {
    if (workers.includes(proc.filename)) ns.kill(proc.pid);
  }
}

function printStatus(ns) {
  const money = ns.getPlayer().money;
  const hackLevel = ns.getHackingLevel();
  const rooted = getAllServers(ns).filter(h => ns.hasRootAccess(h)).length;
  const pservers = ns.getPurchasedServers().length;
  const homeRam = ns.getServerMaxRam("home");

  ns.tprint(`[start] Hack:${hackLevel} | Money:${fmtMoney(money)} | Rooted:${rooted} | PServers:${pservers} | Home RAM:${homeRam}GB`);
}
