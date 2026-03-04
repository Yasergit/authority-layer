// ─────────────────────────────────────────────────────────────────────────────
// AuthorityLayer + OpenAI — Integration Example
//
// Shows how to wrap OpenAI chat completions with AuthorityLayer enforcement:
//   • Budget cap: halt when cumulative token spend exceeds a USD limit
//   • Loop guard: halt after too many tool calls in a single run
//   • Tool throttle: halt if tool calls exceed a per-minute rate
//
// This file uses a MOCK OpenAI client so it runs without a real API key.
// To use with a real key, swap the mock for the real OpenAI client
// (see the comment in createOpenAIClient() below).
//
// Install:
//   npm install authority-layer openai
//
// Run (from repo root, after building):
//   npx ts-node examples/openai-agent.ts
// ─────────────────────────────────────────────────────────────────────────────

import { AuthorityLayer, EnforcementHalt } from "authority-layer";

// ── OpenAI pricing constants (GPT-4o, as of 2025) ────────────────────────────
// https://openai.com/pricing
const GPT4O_INPUT_PRICE_PER_TOKEN = 0.000005;  // $5.00 / 1M tokens
const GPT4O_OUTPUT_PRICE_PER_TOKEN = 0.000015;  // $15.00 / 1M tokens

function estimateCostUSD(usage: { prompt_tokens: number; completion_tokens: number }): number {
    return (
        usage.prompt_tokens * GPT4O_INPUT_PRICE_PER_TOKEN +
        usage.completion_tokens * GPT4O_OUTPUT_PRICE_PER_TOKEN
    );
}

// ── Mock OpenAI client (swap this for `new OpenAI()` with a real key) ────────
//
// Real usage:
//   import OpenAI from "openai";
//   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
//
function createOpenAIClient() {
    return {
        chat: {
            completions: {
                async create(params: { model: string; messages: { role: string; content: string }[] }) {
                    // Simulate network latency
                    await new Promise(r => setTimeout(r, 30));

                    const prompt = params.messages.at(-1)?.content ?? "";
                    return {
                        choices: [
                            { message: { role: "assistant", content: `[mock] Response to: "${prompt}"` } },
                        ],
                        usage: {
                            prompt_tokens: 120,   // realistic for a short system + user message
                            completion_tokens: 80,    // realistic short response
                            total_tokens: 200,
                        },
                        model: params.model,
                    };
                },
            },
        },
    };
}

const openai = createOpenAIClient();

// ── AuthorityLayer configuration ──────────────────────────────────────────────

const authority = new AuthorityLayer({
    // Halt the agent if cumulative token spend exceeds $0.05 (demo threshold).
    // Set this to your actual daily/per-run budget in production.
    budget: { dailyUSD: 0.05 },

    // Halt if a single agent run makes more than 10 tool calls.
    // Prevents infinite reasoning loops that call the model repeatedly.
    loopGuard: { maxToolCallsPerRun: 10 },

    // Halt if more than 60 tool calls happen within any 60-second window.
    // Prevents retry storms from hammering the OpenAI API.
    toolThrottle: { maxCallsPerMinute: 60 },
});

// ── Simulated agent task ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = "You are a helpful assistant. Answer concisely.";

const USER_TASKS = [
    "What is the capital of France?",
    "Summarize the water cycle in one sentence.",
    "What year was the Eiffel Tower built?",
    "Name three programming languages released before 1990.",
    "What is the boiling point of water in Fahrenheit?",
    "Translate 'hello' into Spanish.",
    // The 7th call will push cumulative spend past the $0.05 budget cap
    // and trigger an EnforcementHalt with reason: "budget_exceeded"
    "This call will exceed the budget cap and be halted by AuthorityLayer.",
];

// ── Main agent loop ───────────────────────────────────────────────────────────

async function main() {
    console.log("\nAuthorityLayer + OpenAI Example");
    console.log("─".repeat(50));
    console.log(`Config: $0.05 budget cap · 10 calls/run · 60 calls/min\n`);

    let totalSpend = 0;
    let callCount = 0;

    try {
        await authority.wrap(async () => {
            for (const task of USER_TASKS) {
                // ── Key integration point ──────────────────────────────────
                // Route every OpenAI call through authority.tool().
                // This applies loop guard + throttle BEFORE the call executes.
                const response = await authority.tool("openai.chat.completions", () =>
                    openai.chat.completions.create({
                        model: "gpt-4o",
                        messages: [
                            { role: "system", content: SYSTEM_PROMPT },
                            { role: "user", content: task },
                        ],
                    })
                );

                callCount++;

                // ── Spend reporting ────────────────────────────────────────
                // AuthorityLayer doesn't know your pricing model.
                // You calculate the USD cost from token counts and report it.
                const cost = estimateCostUSD(response.usage);
                totalSpend += cost;
                authority.recordSpend(cost);  // ← triggers budget check

                const reply = response.choices[0]?.message?.content ?? "(no response)";
                console.log(`  [call ${callCount}] ${reply.slice(0, 60)}`);
                console.log(`           tokens: ${response.usage.total_tokens} · cost: $${cost.toFixed(4)} · cumulative: $${totalSpend.toFixed(4)}\n`);
            }
        });

    } catch (err) {
        if (err instanceof EnforcementHalt) {
            // ── Enforcement halt ───────────────────────────────────────────
            // Always access halt details via err.enforcement — never parse err.message.
            const { reason, limit, spent, event_id } = err.enforcement;

            console.error(`\n⛔  Execution halted by AuthorityLayer\n`);
            console.error(JSON.stringify({ status: "halted", reason, limit, spent, event_id }, null, 2));
        } else {
            // Re-throw unexpected errors — don't swallow real bugs
            throw err;
        }
    }

    // ── Chain audit ───────────────────────────────────────────────────────────
    // Inspect the full tamper-evident event log after the run.
    const chain = authority.getChain();
    const intact = authority.verifyChain();

    console.log("\n── Enforcement event chain " + "─".repeat(24));
    for (const event of chain) {
        console.log(`  ${event.type.padEnd(22)} ${event.event_id}`);
    }
    console.log(`\nChain integrity : ${intact ? "✅  verified" : "❌  TAMPERED"}`);
    console.log(`Total events    : ${chain.length}\n`);
}

main().catch(err => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
