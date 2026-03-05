/** Minimal grow worker — 1.75 GB RAM. Args: [target] */
export async function main(ns) {
  await ns.grow(ns.args[0]);
}
