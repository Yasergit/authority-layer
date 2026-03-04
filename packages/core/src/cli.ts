#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// authority-layer CLI dispatcher
//
// Routes subcommands to their implementations.
// All new subcommands should be added here.
//
// Usage:
//   npx authority-layer doctor
//   npx authority-layer simulate
// ─────────────────────────────────────────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[1;36m";
const YELLOW = "\x1b[1;33m";

const subcommand = process.argv[2];

switch (subcommand) {
    case "doctor": {
        // Doctor runs its own top-level logic — require the compiled file directly
        require("./doctor");
        break;
    }

    case "simulate": {
        const { runSimulate } = require("./cli/simulate") as { runSimulate: () => Promise<void> };
        runSimulate().catch((err: unknown) => {
            console.error(err);
            process.exit(1);
        });
        break;
    }

    default: {
        const pkg = require("../package.json") as { name: string; version: string };
        console.log(`\n${BOLD}${pkg.name}${RESET}  ${DIM}v${pkg.version}${RESET}\n`);
        console.log("Usage:\n");
        console.log(`  ${CYAN}authority-layer doctor${RESET}    ${DIM}Run environment checks${RESET}`);
        console.log(`  ${CYAN}authority-layer simulate${RESET}  ${DIM}Run a live enforcement simulation${RESET}`);
        console.log();
        if (subcommand) {
            console.log(`${YELLOW}Unknown command: ${subcommand}${RESET}\n`);
            process.exit(1);
        }
        process.exit(0);
    }
}
