/**
 * Recursively scan from home to discover all servers in the network.
 * Returns a flat array of unique hostnames (excluding "home").
 * @param {NS} ns
 * @returns {string[]}
 */
export function getAllServers(ns) {
  const visited = new Set(["home"]);
  const queue = ["home"];
  while (queue.length > 0) {
    const host = queue.shift();
    for (const neighbor of ns.scan(host)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  visited.delete("home");
  return [...visited];
}

/**
 * Try to gain root access on a server using available port programs.
 * @param {NS} ns
 * @param {string} host
 * @returns {boolean} true if root was gained
 */
export function tryRoot(ns, host) {
  if (ns.hasRootAccess(host)) return true;

  const openers = [
    ["BruteSSH.exe",   (h) => ns.brutessh(h)],
    ["FTPCrack.exe",   (h) => ns.ftpcrack(h)],
    ["relaySMTP.exe",  (h) => ns.relaysmtp(h)],
    ["HTTPWorm.exe",   (h) => ns.httpworm(h)],
    ["SQLInject.exe",  (h) => ns.sqlinject(h)],
  ];

  let portsOpened = 0;
  for (const [file, fn] of openers) {
    if (ns.fileExists(file, "home")) {
      fn(host);
      portsOpened++;
    }
  }

  const needed = ns.getServerNumPortsRequired(host);
  const hackLevel = ns.getHackingLevel();
  const reqLevel = ns.getServerRequiredHackingLevel(host);

  if (portsOpened >= needed && hackLevel >= reqLevel) {
    ns.nuke(host);
    return ns.hasRootAccess(host);
  }
  return false;
}

/**
 * Pick the best hackable target from rooted servers based on
 * money-per-second potential (maxMoney / minSecurity).
 * @param {NS} ns
 * @param {string[]} servers
 * @returns {string}
 */
export function pickTarget(ns, servers) {
  const hackLevel = ns.getHackingLevel();
  let best = null;
  let bestScore = -1;

  for (const host of servers) {
    if (!ns.hasRootAccess(host)) continue;
    if (ns.getServerRequiredHackingLevel(host) > hackLevel / 2) continue;
    if (ns.getServerMaxMoney(host) <= 0) continue;

    const maxMoney = ns.getServerMaxMoney(host);
    const minSec   = ns.getServerMinSecurityLevel(host);
    const score    = maxMoney / minSec;

    if (score > bestScore) {
      bestScore = score;
      best = host;
    }
  }

  return best ?? "n00dles";
}

/**
 * Calculate how many threads fit in available RAM on a host.
 * @param {NS} ns
 * @param {string} host
 * @param {string} script
 * @returns {number}
 */
export function maxThreads(ns, host, script) {
  const free = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
  const cost = ns.getScriptRam(script, "home");
  if (cost <= 0) return 0;
  return Math.floor(free / cost);
}

/** Format money for display. */
export function fmtMoney(n) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(0)}`;
}
