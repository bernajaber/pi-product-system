/**
 * Unit tests for product-loop.ts
 *
 * Tests the follow-up logic, review cycle counting, phase transitions,
 * surgical fix mode, stuck escalation, and session restart resume.
 *
 * Run: node --experimental-strip-types test/test-product-loop.ts
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Test infrastructure ────────────────────────────────────────────────────

let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
	testCount++;
	try {
		const result = fn();
		if (result instanceof Promise) {
			return result
				.then(() => { passCount++; console.log(`  ✅ ${name}`); })
				.catch((e: Error) => { failCount++; console.log(`  ❌ ${name}: ${e.message}`); });
		}
		passCount++;
		console.log(`  ✅ ${name}`);
	} catch (e: any) {
		failCount++;
		console.log(`  ❌ ${name}: ${e.message}`);
	}
}

// ─── Mock Pi API ────────────────────────────────────────────────────────────

type Handler = (event: any, ctx: any) => Promise<void>;

function createMockPi() {
	const handlers: Record<string, Handler[]> = {};
	const messages: Array<{ msg: any; opts: any }> = [];
	const entries: any[] = [];

	const pi = {
		on(event: string, handler: Handler) {
			handlers[event] = handlers[event] || [];
			handlers[event].push(handler);
		},
		appendEntry(type: string, data: any) {
			entries.push({ type: "custom", customType: type, data: structuredClone(data) });
		},
		sendMessage(msg: any, opts: any) {
			messages.push({ msg, opts });
		},
	};

	return { pi, handlers, messages, entries };
}

function createMockCtx(cwd: string, entries: any[], overrides: any = {}) {
	return {
		cwd,
		hasUI: false,
		hasPendingMessages: () => false,
		sessionManager: { getEntries: () => entries },
		model: null,
		modelRegistry: { getApiKey: async () => null },
		ui: {
			setWidget: () => {},
			confirm: async () => false,
			notify: () => {},
		},
		...overrides,
	};
}

// ─── Fixture helpers ────────────────────────────────────────────────────────

function createTempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-loop-test-"));
	fs.mkdirSync(path.join(dir, ".pi"), { recursive: true });
	return dir;
}

function writeWorkflowState(dir: string, state: any) {
	fs.writeFileSync(path.join(dir, ".pi", "workflow-state.json"), JSON.stringify(state, null, 2));
}

function writeReviewGuidelines(dir: string, content: string) {
	fs.writeFileSync(path.join(dir, "REVIEW_GUIDELINES.md"), content);
}

function cleanupDir(dir: string) {
	fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Load the real extension ────────────────────────────────────────────────

async function loadExtension() {
	const mod = await import("../extensions/product-loop.ts");
	return mod.default;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fireAgentEnd(handlers: Record<string, Handler[]>, ctx: any, messages: Array<{ role?: string; stopReason?: string }> = [{ role: "assistant", stopReason: "end_turn" }]) {
	const agentEndHandlers = handlers["agent_end"] || [];
	for (const handler of agentEndHandlers) {
		await handler({ messages }, ctx);
	}
}

async function fireSessionStart(handlers: Record<string, Handler[]>, ctx: any) {
	const sessionStartHandlers = handlers["session_start"] || [];
	for (const handler of sessionStartHandlers) {
		await handler({}, ctx);
	}
}

function getLastMessage(messages: Array<{ msg: any; opts: any }>): string | null {
	if (messages.length === 0) return null;
	return messages[messages.length - 1].msg.content;
}

function assertMessageContains(messages: Array<{ msg: any; opts: any }>, substring: string, label: string) {
	const last = getLastMessage(messages);
	assert.ok(last, `Expected a message for: ${label}`);
	assert.ok(last!.includes(substring), `Expected "${substring}" in message for ${label}. Got: ${last!.slice(0, 200)}`);
}

function assertNoMessage(messages: Array<{ msg: any; opts: any }>, label: string) {
	const initialLen = messages.length;
	// Check that no NEW message was added (messages array may have previous messages)
	// This is checked by the caller saving messages.length before the action
}

// ─── TESTS ──────────────────────────────────────────────────────────────────

async function runTests() {
	const productLoop = await loadExtension();

	console.log("\n═══ product-loop.ts unit tests ═══\n");

	// ─── BUILD PHASE ────────────────────────────────────────────────────────

	console.log("Build phase:");

	await test("build: no progress → initial instructions", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build" });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "build phase", "initial build instructions");
		assertMessageContains(messages, "plan.md", "references plan");
		cleanupDir(dir);
	});

	await test("build: task 3 of 8 → continue with Task 4", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 3, of: 8, status: "ok" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "Task 3 of 8 done", "reports completion");
		assertMessageContains(messages, "Task 4", "next task number");
		cleanupDir(dir);
	});

	await test("build: all tasks done → transition to test", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 8, of: 8, status: "ok" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "All 8 build tasks complete", "all done");
		assertMessageContains(messages, '"test"', "transition to test");
		cleanupDir(dir);
	});

	await test("build: stuck once → diagnostic", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 3, of: 8, status: "stuck" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "stuck", "acknowledges stuck");
		assertMessageContains(messages, "different approach", "suggests alternative");
		cleanupDir(dir);
	});

	await test("build: stuck 2+ turns → escalation", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 3, of: 8, status: "stuck" } });
		const ctx = createMockCtx(dir, entries);
		// First stuck turn
		await fireAgentEnd(handlers, ctx);
		messages.length = 0; // clear
		// Second stuck turn (stuckCount should be 2 now)
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "Escalate", "escalates to operator");
		cleanupDir(dir);
	});

	await test("build: surgical fix mode → targeted instructions", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, {
			currentPhase: "build",
			progress: { task: 0, of: 1, status: "ok" },
			codeLoop: {
				lastFailedScenario: "User can add item to list",
				lastDiagnosis: "addItem function missing",
				lastReentryTask: "Task 2",
			},
		});
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "SURGICAL FIX", "surgical fix mode");
		assertMessageContains(messages, "User can add item to list", "includes scenario");
		assertMessageContains(messages, "Task 2", "includes mapped task");
		cleanupDir(dir);
	});

	// ─── TEST PHASE ─────────────────────────────────────────────────────────

	console.log("\nTest phase:");

	await test("test: no progress → initial instructions", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "test" });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "test phase", "initial test instructions");
		cleanupDir(dir);
	});

	await test("test: passing → transition to review", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "test", progress: { task: 1, of: 1, status: "ok" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, '"review"', "transition to review");
		cleanupDir(dir);
	});

	await test("test: stuck → fix suggestion", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "test", progress: { task: 0, of: 1, status: "stuck" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "failing", "acknowledges failing tests");
		cleanupDir(dir);
	});

	// ─── REVIEW PHASE ───────────────────────────────────────────────────────

	console.log("\nReview phase:");

	await test("review: no progress → initial instructions", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "review" });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "review phase", "initial review instructions");
		cleanupDir(dir);
	});

	await test("review: cycle counting — 3 full cycles before force-proceed", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeReviewGuidelines(dir, "# Test Guidelines\nP0: important stuff");
		const ctx = createMockCtx(dir, entries);

		// Phase enter (no progress yet)
		writeWorkflowState(dir, { currentPhase: "review" });
		await fireAgentEnd(handlers, ctx);
		messages.length = 0;

		// Cycle 1: set progress, trigger agent_end
		writeWorkflowState(dir, { currentPhase: "review", progress: { task: 0, of: 1, status: "ok" } });
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "Review cycle 1 of 3", "cycle 1");
		assertMessageContains(messages, "Test Guidelines", "includes project guidelines");
		messages.length = 0;

		// Cycle 2: agent fixed P0, progress still {0, 1, "ok"}
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "Review cycle 2 of 3", "cycle 2");
		messages.length = 0;

		// Cycle 3: still not clean
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "Review cycle 3 of 3", "cycle 3");
		messages.length = 0;

		// Cycle 4: should force-proceed
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "Review has run 3 cycles", "force-proceed");
		assertMessageContains(messages, "validate", "transitions to validate");
		cleanupDir(dir);
	});

	await test("review: clean → transition to validate", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "review", progress: { task: 1, of: 1, status: "ok" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "clean", "review clean");
		assertMessageContains(messages, '"validate"', "transition to validate");
		cleanupDir(dir);
	});

	await test("review: stuck → fix suggestion", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "review", progress: { task: 0, of: 1, status: "stuck" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assertMessageContains(messages, "trouble fixing", "acknowledges stuck review");
		cleanupDir(dir);
	});

	// ─── PHASE TRANSITIONS ──────────────────────────────────────────────────

	console.log("\nPhase transitions:");

	await test("non-autonomous phase → no follow-up", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "discovery" });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assert.strictEqual(messages.length, 0, "should not send follow-up for non-autonomous phase");
		cleanupDir(dir);
	});

	await test("phase change resets counters", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		const ctx = createMockCtx(dir, entries);

		// Enter build phase
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 3, of: 8, status: "stuck" } });
		await fireAgentEnd(handlers, ctx);
		// stuckCount should be 1 now
		await fireAgentEnd(handlers, ctx);
		// stuckCount should be 2 now — escalation
		messages.length = 0;

		// Switch to test phase — counters should reset
		writeWorkflowState(dir, { currentPhase: "test" });
		await fireAgentEnd(handlers, ctx);
		// Should NOT be in escalation mode (stuckCount reset)
		const msg = getLastMessage(messages);
		assert.ok(msg, "should send message");
		assert.ok(!msg!.includes("Escalate"), "should NOT be escalating after phase change");
		cleanupDir(dir);
	});

	await test("pending message → no follow-up", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 3, of: 8, status: "ok" } });
		const ctx = createMockCtx(dir, entries, { hasPendingMessages: () => true });
		await fireAgentEnd(handlers, ctx);
		assert.strictEqual(messages.length, 0, "should not send follow-up when operator has pending message");
		cleanupDir(dir);
	});

	// ─── SESSION RESTART ────────────────────────────────────────────────────

	console.log("\nSession restart:");

	await test("session_start with active build phase → resume follow-up", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 3, of: 8, status: "ok" } });
		const ctx = createMockCtx(dir, entries);
		await fireSessionStart(handlers, ctx);
		assertMessageContains(messages, "Task 3 of 8 done", "resumes from correct state");
		cleanupDir(dir);
	});

	await test("session_start with non-autonomous phase → no follow-up", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "discovery" });
		const ctx = createMockCtx(dir, entries);
		await fireSessionStart(handlers, ctx);
		assert.strictEqual(messages.length, 0, "should not send follow-up for non-autonomous phase");
		cleanupDir(dir);
	});

	await test("session_start with no workflow-state → no follow-up", async () => {
		const dir = createTempDir();
		// Don't write workflow-state.json
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		const ctx = createMockCtx(dir, entries);
		await fireSessionStart(handlers, ctx);
		assert.strictEqual(messages.length, 0, "should not send follow-up without workflow state");
		cleanupDir(dir);
	});

	// ─── GUIDED PHASES (init) ───────────────────────────────────────────────

	console.log("\nGuided phases (init):");

	await test("session_start with init phase → nudge with triggerTurn=false", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "init" });
		const ctx = createMockCtx(dir, entries);
		await fireSessionStart(handlers, ctx);
		assert.strictEqual(messages.length, 1, "should send exactly one nudge");
		assertMessageContains(messages, "discovery", "directs to discovery");
		assert.strictEqual(messages[0].opts.triggerTurn, false, "triggerTurn should be false for guided nudge");
		cleanupDir(dir);
	});

	await test("init phase → nudge sent only once (session_start then agent_end)", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "init" });
		const ctx = createMockCtx(dir, entries);

		// session_start: should send nudge
		await fireSessionStart(handlers, ctx);
		assert.strictEqual(messages.length, 1, "session_start sends nudge");

		// agent_end: should NOT send nudge again (guidedNudgeSent=true)
		messages.length = 0;
		await fireAgentEnd(handlers, ctx);
		assert.strictEqual(messages.length, 0, "agent_end should not repeat nudge");
		cleanupDir(dir);
	});

	await test("session_start with discovery phase → no nudge", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "discovery" });
		const ctx = createMockCtx(dir, entries);
		await fireSessionStart(handlers, ctx);
		assert.strictEqual(messages.length, 0, "discovery phase should not get nudge");
		cleanupDir(dir);
	});

	// ─── SENDMESSAGE CONTRACT ───────────────────────────────────────────────

	console.log("\nsendMessage contract:");

	await test("follow-ups use deliverAs: followUp + triggerTurn: true", async () => {
		const dir = createTempDir();
		const { pi, handlers, messages, entries } = createMockPi();
		productLoop(pi as any);
		writeWorkflowState(dir, { currentPhase: "build", progress: { task: 3, of: 8, status: "ok" } });
		const ctx = createMockCtx(dir, entries);
		await fireAgentEnd(handlers, ctx);
		assert.ok(messages.length > 0, "should send a message");
		const last = messages[messages.length - 1];
		assert.strictEqual(last.opts.deliverAs, "followUp", "deliverAs should be followUp");
		assert.strictEqual(last.opts.triggerTurn, true, "triggerTurn should be true");
		assert.strictEqual(last.msg.customType, "product-loop", "customType should be product-loop");
		assert.strictEqual(last.msg.display, true, "display should be true");
		cleanupDir(dir);
	});

	// ─── SUMMARY ────────────────────────────────────────────────────────────

	console.log(`\n═══ Results: ${passCount}/${testCount} passed, ${failCount} failed ═══\n`);
	if (failCount > 0) process.exit(1);
}

runTests().catch((e) => {
	console.error("Test runner failed:", e);
	process.exit(1);
});
