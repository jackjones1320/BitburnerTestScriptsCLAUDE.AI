/** Shared configuration constants for Bitburner automation. */

// Hacking targets in priority order (early → late game)
export const TARGETS = [
  "n00dles",
  "foodnstuff",
  "joesguns",
  "nectar-net",
  "hong-fang-tea",
  "harakiri-sushi",
  "iron-gym",
  "sigma-cosmetics",
  "phantasy",
  "omega-net",
  "the-hub",
  "comptek",
  "max-hardware",
];

// Port-opening programs in order of requirement
export const PORT_PROGRAMS = [
  "BruteSSH.exe",
  "FTPCrack.exe",
  "relaySMTP.exe",
  "HTTPWorm.exe",
  "SQLInject.exe",
];

// Worker script paths
export const WORKER_HACK   = "hack/worker-hack.js";
export const WORKER_GROW   = "hack/worker-grow.js";
export const WORKER_WEAKEN = "hack/worker-weaken.js";

// RAM sizes for purchased servers (powers of 2)
export const PSERVER_SIZES = [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
export const PSERVER_PREFIX = "pserv-";
export const PSERVER_MAX = 25; // Bitburner hard limit

// Security thresholds
export const SECURITY_BUFFER = 3;   // extra above min before weakening
export const MONEY_RATIO     = 0.75; // grow when below this fraction of max

// Timing
export const LOOP_SLEEP = 1000; // ms between main loop iterations
