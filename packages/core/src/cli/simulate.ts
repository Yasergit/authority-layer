// ─────────────────────────────────────────────────────────────────────────────
// authority-layer simulate
//
// Runs a short simulated agent execution that intentionally exceeds the
// budget cap so developers can see enforcement halt output without writing
// any code.
//
// Usage:
//   npx authority-layer simulate
// ─────────────────────────────────────────────────────────────────────────────

import { AuthorityLayer } from "../AuthorityLayer";
import { EnforcementHalt } from "../EnforcementHalt";

const RESET = "\x1b[0m";
const GREEN = "\x1b[1;32m";
const RED = "\x1b[1;31m";
const YELLOW = "\x1b[1;33m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

export async function runSimulate(): Promise<void> {
    console.log(`\n${BOLD}AuthorityLayer Simulation${RESET}`);
    console.log(`${DIM}Demonstrating runtime enforcement.${RESET}\n`);

    const authority = new AuthorityLayer({
        budget: { dailyUSD: 0.05 },
        loopGuard: { maxToolCallsPerRun: 10 },
        toolThrottle: { maxCallsPerMinute: 100 },
    });

    console.log(`${DIM}Config: $0.05 budget cap · 10 calls/run max · 100 calls/min${RESET}\n`);
    console.log("Starting simulated agent run...\n");

    let callCount = 0;

    try {
        await authority.wrap(async () => {
            // 7 calls × $0.01 = $0.07 — exceeds the $0.05 cap after call 6
            for (let i = 1; i <= 7; i++) {
                callCount++;
                await authority.tool("llm.chat", async () => "LLM response");
                console.log(`  Tool call #${i}  ${DIM}llm.chat${RESET}`);
                authority.recordSpend(0.01);
            }
        });
    } catch (err) {
        if (err instanceof EnforcementHalt) {
            console.log(`\n${RED}${BOLD}⛔ Execution halted by AuthorityLayer${RESET}\n`);
            const h = err.enforcement;
            const display = {
                status: h.status,
                reason: h.reason,
                limit: Math.round(h.limit * 100) / 100,
                spent: Math.round(h.spent * 100) / 100,
                event_id: h.event_id,
            };
            console.log(YELLOW + JSON.stringify(display, null, 2) + RESET);
        } else {
            throw err;
        }
    }

    // ── Integrity check ───────────────────────────────────────────────────────

    const valid = authority.verifyChain();
    const chain = authority.getChain();

    console.log(`\n${DIM}─── Event chain ${"─".repeat(44)}${RESET}`);
    for (const event of chain) {
        const ts = new Date(event.timestamp).toISOString().slice(11, 23);
        console.log(`  ${DIM}[${ts}]${RESET}  ${event.type.padEnd(20)}  ${DIM}${event.event_id}${RESET}`);
    }

    console.log();
    if (valid) {
        console.log(`Event chain integrity: ${GREEN}${BOLD}VERIFIED${RESET}`);
    } else {
        console.log(`Event chain integrity: ${RED}${BOLD}TAMPERED${RESET}`);
    }
    console.log(`Total events: ${chain.length}\n`);
}
