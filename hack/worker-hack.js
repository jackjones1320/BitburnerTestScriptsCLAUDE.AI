/** Minimal hack worker — 1.7 GB RAM. Args: [target] */
export async function main(ns) {
  while (true) { await ns.hack(ns.args[0]); }
}
