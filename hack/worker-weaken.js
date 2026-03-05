/** Minimal weaken worker — 1.75 GB RAM. Args: [target] */
export async function main(ns) {
  while (true) { await ns.weaken(ns.args[0]); }
}
