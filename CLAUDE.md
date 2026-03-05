# CLAUDE.md — Bitburner Automation Project

## Project Goal

Beat Bitburner autonomously using only Claude-written scripts. This means completing BitNode-1 (and subsequent BitNodes) through scripted automation, ultimately joining the Daedalus faction, installing The Red Pill augmentation, and destroying the World Daemon.

Claude operates with **full autonomy** — no hand-holding, no manual play. The only human input expected is:
1. Pasting error messages from the in-game terminal
2. Pulling updated scripts via `git-pull.js`

---

## How Claude Works in This Repo

Claude writes all `.js` scripts and commits them to this repo. The player runs `git-pull.js` inside Bitburner to pull everything to their home server. Claude iterates based on errors and feedback.

### Workflow
1. Claude writes/updates scripts in this repo
2. Player runs `killall` in Bitburner terminal (stops all running scripts)
3. Player runs `run git-pull.js` in Bitburner terminal
4. Player runs `run start.js`
5. If errors occur, player pastes them here
6. Claude fixes and re-commits — repeat

> **Important:** Always `killall` before `git-pull.js` + `start.js` to avoid
> stale scripts conflicting with updated ones.

---

## Repository Structure

```
/
├── CLAUDE.md              ← This file
├── git-pull.js            ← Bootstrap: pulls all scripts from this repo into Bitburner
├── start.js               ← Entry point: orchestrates everything
├── hack/
│   ├── worker-hack.js     ← Minimal hack worker (low RAM)
│   ├── worker-grow.js     ← Minimal grow worker (low RAM)
│   ├── worker-weaken.js   ← Minimal weaken worker (low RAM)
│   └── batcher.js         ← Batch HWGW scheduler
├── net/
│   ├── crawler.js         ← Discovers and roots all accessible servers
│   └── deploy.js          ← Copies workers + launches threads across all servers
├── money/
│   ├── hacknet.js         ← Hacknet node buyer/upgrader
│   └── share.js           ← Shares RAM for faction rep when idle
├── faction/
│   ├── manager.js         ← Joins factions, works for rep, buys/installs augs
│   └── augments.js        ← Tracks and prioritizes augmentation purchases
├── utils/
│   ├── constants.js       ← Shared config values
│   └── helpers.js         ← Common utility functions
└── singularity/
    └── autopilot.js       ← Full automation once Singularity API is unlocked (BN4/SF4)
```

---

## Game Mechanics Reference

### Core Loop (BitNode-1)
1. **Hack servers** → earn money + hacking XP
2. **Buy RAM** (home + purchased servers) → run more threads
3. **Join factions** → earn reputation → buy augmentations
4. **Install augmentations** → reset with multipliers → repeat stronger
5. **Unlock Daedalus** → install The Red Pill → run `hack` on `w0r1d_d43m0n` → win BN1

### Winning Condition for BN1
- Join **Daedalus** faction (requires: 1M hacking skill OR 2500 combat stats + 30 augs installed)
- Buy **The Red Pill** augmentation from Daedalus
- Install augmentations (soft reset)
- Gain access to `w0r1d_d43m0n` server
- Your hacking level must be ≥ required level to hack it
- Run `hack w0r1d_d43m0n` or script it → destroys the BitNode

### Key Server Progression
Early targets (low security, decent money):
- `n00dles` → `foodnstuff` → `joesguns` → `nectar-net` → `hong-fang-tea`
- Mid: `harakiri-sushi`, `iron-gym`, `sigma-cosmetics`
- Late: `phantasy`, `omega-net`, `the-hub`, `comptek`, `max-hardware`

### Port Programs (needed to root servers)
| Program | Ports Opened | How to Get |
|---------|-------------|------------|
| BruteSSH.exe | 1 | Buy or create (hacking 50) |
| FTPCrack.exe | 2 | Buy or create (hacking 100) |
| relaySMTP.exe | 3 | Buy or create (hacking 250) |
| HTTPWorm.exe | 4 | Buy or create (hacking 500) |
| SQLInject.exe | 5 | Buy or create (hacking 750) |

### Key Factions (BN1 path to Daedalus)
- **CyberSec** → early hacking augs (backdoor CSEC)
- **NiteSec** → mid hacking augs (backdoor avmnite-02h)
- **The Black Hand** → strong hacking augs (backdoor I.I.I.I)
- **BitRunners** → best hacking augs (backdoor run4theh111z)
- **Daedalus** → The Red Pill (requires 30+ augs installed across resets)

---

## Script Design Principles

### RAM Efficiency
- Worker scripts (hack/grow/weaken) must be as small as possible — ideally 1.7 GB each
- Only import `ns` functions actually used in that script
- Keep orchestration logic in separate scripts that run on home

### HWGW Batch Hacking
The optimal late-game strategy: schedule Hack → Weaken → Grow → Weaken in batches timed to land in correct order, maintaining server at minimum security and max money between batches.

### Early Game (< $1M, < 32GB RAM)
- Use simple sequential WGH loop on `n00dles` then `foodnstuff`
- Crawler finds all servers and roots any rootable ones
- Deploy workers to every available server using all free RAM

### Mid Game (> $1M, > 64GB RAM)
- Switch to a proper target selector (max money / min security ratio)
- Start buying purchased servers (25GB → 50GB → upgrade over time)
- Begin faction work and augmentation purchases

### Late Game (> 10 augs queued, Singularity unlocked)
- Full autopilot via Singularity API: auto-join factions, auto-work, auto-buy augs
- Install augs and soft-reset when diminishing returns hit
- Each reset: re-root servers, redeploy, continue faction grind

---

## NS API Cheat Sheet

### Always Available
```js
ns.hack(target)           // Steal money
ns.grow(target)           // Increase server money
ns.weaken(target)         // Decrease server security
ns.getServerMaxMoney(host)
ns.getServerMoneyAvailable(host)
ns.getServerMinSecurityLevel(host)
ns.getServerSecurityLevel(host)
ns.getServerMaxRam(host)
ns.getServerUsedRam(host)
ns.getServerRequiredHackingLevel(host)
ns.getServerNumPortsRequired(host)
ns.getHackingLevel()
ns.scan(host)             // Returns adjacent servers
ns.nuke(host)             // Root server (needs 0 ports open)
ns.brutessh(host)         // Open SSH port
ns.ftpcrack(host)         // Open FTP port
ns.relaysmtp(host)        // Open SMTP port
ns.httpworm(host)         // Open HTTP port
ns.sqlinject(host)        // Open SQL port
ns.hasRootAccess(host)
ns.exec(script, host, threads, ...args)
ns.scp(files, host, source)
ns.ps(host)               // Running scripts on host
ns.kill(pid)
ns.sleep(ms)
ns.print(msg)
ns.tprint(msg)
ns.args                   // Script arguments
ns.getHostname()
ns.getPurchasedServers()
ns.purchaseServer(name, ram)
ns.upgradePurchasedServer(host, ram)
ns.getPlayer()
ns.fileExists(file, host)
ns.wget(url, filename)    // Download file from URL — used by git-pull.js
```

### Requires Singularity API (BN4 or SF4)
```js
ns.singularity.applyToCompany(company, field)
ns.singularity.workForCompany(company)
ns.singularity.joinFaction(faction)
ns.singularity.workForFaction(faction, workType)
ns.singularity.purchaseAugmentation(faction, aug)
ns.singularity.installAugmentations(callback)
ns.singularity.createProgram(program)
ns.singularity.getDarkwebPrograms()
ns.singularity.purchaseTor()
```

### Hacknet
```js
ns.hacknet.numNodes()
ns.hacknet.purchaseNode()
ns.hacknet.upgradeLevel(i, n)
ns.hacknet.upgradeRam(i, n)
ns.hacknet.upgradeCore(i, n)
ns.hacknet.getNodeStats(i)
ns.hacknet.getLevelUpgradeCost(i, n)
ns.hacknet.getPurchaseNodeCost()
```

---

## Error Handling Notes

- If you see `RAM exceeded` → a script is trying to run with too many threads; reduce thread count or split across servers
- If you see `Cannot be hacked yet` → hacking level too low for target
- If you see `TypeError: X is not a function` → wrong NS namespace or typo
- If you see `SCRIPT CRASHED` → check for missing `await` on async NS calls
- All timed NS calls (`hack`, `grow`, `weaken`) **must be awaited**

---

## Current Status

> Claude tracks progress here. Update after each major milestone.

- [ ] BN1: Basic hacking loop running
- [ ] BN1: All servers rooted
- [ ] BN1: Purchased servers bought and deployed
- [ ] BN1: First faction joined (CyberSec)
- [ ] BN1: Augmentations installed ×1
- [ ] BN1: Daedalus joined
- [ ] BN1: The Red Pill purchased + installed
- [ ] BN1: w0r1d_d43m0n hacked → BitNode destroyed ✓
- [ ] BN2+: Subsequent BitNodes in progress
