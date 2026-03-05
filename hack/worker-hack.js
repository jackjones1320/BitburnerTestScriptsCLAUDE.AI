/** Minimal hack worker — 1.7 GB RAM. Args: [target] */
export async function main(ns) {
  await ns.hack(ns.args[0]);
}
