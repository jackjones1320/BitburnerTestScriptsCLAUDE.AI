/**
 * start.js — Main entry point for Bitburner automation.
 *
 * Orchestrates the full BN1 strategy by launching and supervising
 * dedicated daemon scripts. Kept intentionally thin to minimise RAM:
 *   - net/crawler.js   handles rooting servers
 *   - net/deploy.js    deploys workers across all servers
 *   - money/hacknet.js manages hacknet nodes
 *   - money/servers.js buys/upgrades purchased servers (expensive APIs live there)
 *   - faction/manager.js + singularity/autopilot.js handle late-game
 *
 * Re-checks every loop to restart any daemon that has exited.
 * @param {NS} ns
 */
const LOOP_SLEEP = 30000; // 30 seconds between main iterations

export async function main(ns) {
  ns.disableLog("ALL");
  ns.tprint("=== start.js: Bitburner Automation Engaged ===");

  // Start persistent daemons (only if not already running)
  startDaemon(ns, "money/hacknet.js");
  startDaemon(ns, "money/servers.js");

  while (true) {
    // Root everything we can (crawler runs once and exits; re-exec each loop)
    if (!ns.ps("home").find(p => p.filename === "net/crawler.js")) {
      ns.exec("net/crawler.js", "home", 1);
    }

    // Deploy workers across all rooted servers
    if (!ns.ps("home").find(p => p.filename === "net/deploy.js")) {
      ns.exec("net/deploy.js", "home", 1);
    }

    // Faction manager + singularity autopilot (self-exit if API unavailable)
    startDaemon(ns, "faction/manager.js");
    startDaemon(ns, "singularity/autopilot.js");

    printStatus(ns);

    await ns.sleep(LOOP_SLEEP);
  }
}

function startDaemon(ns, script) {
  if (ns.ps("home").find(p => p.filename === script)) return;
  ns.exec(script, "home", 1);
}

function printStatus(ns) {
  const money = ns.getPlayer().money;
  const hackLevel = ns.getHackingLevel();
  const moneyStr = money >= 1e9  ? `$${(money / 1e9).toFixed(2)}B`
                 : money >= 1e6  ? `$${(money / 1e6).toFixed(2)}M`
                 : money >= 1e3  ? `$${(money / 1e3).toFixed(2)}K`
                 : `$${money.toFixed(0)}`;
  ns.tprint(`[start] Hack:${hackLevel} | Money:${moneyStr}`);
}
