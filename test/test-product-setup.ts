/**
 * Unit tests for product-setup extension
 *
 * Tests that /setup creates the correct files with correct content.
 *
 * Run: node --experimental-strip-types test/test-product-setup.ts
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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

// ─── Mock Pi API for product-setup ──────────────────────────────────────────

function createMockPi() {
	const commands: Record<string, any> = {};
	const messages: any[] = [];

	const pi = {
		registerCommand(name: string, config: any) {
			commands[name] = config;
		},
		sendMessage(msg: any, opts: any) {
			messages.push({ msg, opts });
		},
	};

	return { pi, commands, messages };
}

// ─── TESTS ──────────────────────────────────────────────────────────────────

async function runTests() {
	const mod = await import("../extensions/product-setup/index.ts");
	const productSetup = mod.default;

	// Helper: create a temp project dir with product-constitution.md pre-installed
	// (simulates local install — product-setup checks for this file)
	function createTestProject(): string {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-setup-test-"));
		const piDir = path.join(dir, ".pi");
		fs.mkdirSync(piDir, { recursive: true });
		fs.writeFileSync(path.join(piDir, "product-constitution.md"), "# Test Constitution\n");
		return dir;
	}

	console.log("\n═══ product-setup unit tests ═══\n");

	console.log("Registration:");

	await test("registers /setup command", async () => {
		const { pi, commands } = createMockPi();
		productSetup(pi as any);
		assert.ok(commands["setup"], "should register 'setup' command");
		assert.ok(commands["setup"].handler, "should have a handler");
		assert.ok(commands["setup"].description, "should have a description");
	});

	console.log("\nFile creation:");

	await test("/setup creates all required files", async () => {
		const dir = createTestProject();
		const { pi, commands, messages } = createMockPi();
		productSetup(pi as any);

		const mockCtx = {
			cwd: dir,
			ui: {
				notify: (msg: string, level: string) => {},
			},
		};

		await commands["setup"].handler("", mockCtx);

		// Check files exist
		const expectedFiles = [
			".pi/AGENTS.md",
			".pi/engineering-constitution.md",
			".pi/workflow-state.json",
			"REVIEW_GUIDELINES.md",
			".gitignore",
		];

		for (const file of expectedFiles) {
			const fullPath = path.join(dir, file);
			assert.ok(fs.existsSync(fullPath), `${file} should exist`);
		}

		// Check git was initialized
		assert.ok(fs.existsSync(path.join(dir, ".git")), ".git should exist");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	await test("AGENTS.md has V2 workflow with 9 phases", async () => {
		const dir = createTestProject();
		const { pi, commands } = createMockPi();
		productSetup(pi as any);

		await commands["setup"].handler("", { cwd: dir, ui: { notify: () => {} } });

		const content = fs.readFileSync(path.join(dir, ".pi", "AGENTS.md"), "utf-8");

		// V2 skill names
		for (const skill of ["discovery", "specify", "plan", "analyze", "build", "test", "review", "validate", "publish"]) {
			assert.ok(content.includes(skill), `AGENTS.md should mention skill: ${skill}`);
		}

		// V2 gates
		assert.ok(content.includes("Gate 1"), "should have Gate 1");
		assert.ok(content.includes("Gate 2"), "should have Gate 2");
		assert.ok(content.includes("Gate 3"), "should have Gate 3");

		// No V1 references
		assert.ok(!content.includes("product-specify"), "should NOT have V1 skill name product-specify");
		assert.ok(!content.includes("build-loop"), "should NOT have V1 skill name build-loop");
		assert.ok(!content.includes("/loop self"), "should NOT have V1 command /loop self");
		assert.ok(!content.includes("/loop tests"), "should NOT have V1 command /loop tests");

		// Product-loop references
		assert.ok(content.includes("product-loop"), "should mention product-loop extension");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	await test("workflow-state.json has V2 schema", async () => {
		const dir = createTestProject();
		const { pi, commands } = createMockPi();
		productSetup(pi as any);

		await commands["setup"].handler("", { cwd: dir, ui: { notify: () => {} } });

		const state = JSON.parse(fs.readFileSync(path.join(dir, ".pi", "workflow-state.json"), "utf-8"));

		// V2 fields
		assert.strictEqual(state.currentPhase, "init", "initial phase should be 'init'");
		assert.strictEqual(state.feature, null, "feature should be null");
		assert.ok(state.gates, "should have gates object");
		assert.strictEqual(state.gates.briefApproved, false, "briefApproved should be false");
		assert.strictEqual(state.gates.planApproved, false, "planApproved should be false");
		assert.strictEqual(state.gates.releaseApproved, false, "releaseApproved should be false");
		assert.ok(state.analyzeLoop, "should have analyzeLoop");
		assert.strictEqual(state.analyzeLoop.maxCycles, 3, "analyzeLoop maxCycles should be 3");
		assert.ok(state.codeLoop, "should have codeLoop");
		assert.strictEqual(state.codeLoop.maxCycles, 3, "codeLoop maxCycles should be 3");

		// No V1 fields
		assert.strictEqual(state.gates.specApproved, undefined, "should NOT have V1 gate name specApproved");
		assert.strictEqual(state.gates.buildApproved, undefined, "should NOT have V1 gate name buildApproved");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	await test("REVIEW_GUIDELINES.md has plan skill marker", async () => {
		const dir = createTestProject();
		const { pi, commands } = createMockPi();
		productSetup(pi as any);

		await commands["setup"].handler("", { cwd: dir, ui: { notify: () => {} } });

		const content = fs.readFileSync(path.join(dir, "REVIEW_GUIDELINES.md"), "utf-8");

		// The marker that the plan skill looks for
		assert.ok(
			content.includes("<!-- Plan skill updates this section with project-specific rules -->"),
			"should have the marker that plan skill uses to inject tech standards"
		);

		// V2 severity levels
		assert.ok(content.includes("P0"), "should have P0 severity");
		assert.ok(content.includes("P1"), "should have P1 severity");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	await test("sendMessage is called with correct contract", async () => {
		const dir = createTestProject();
		const { pi, commands, messages } = createMockPi();
		productSetup(pi as any);

		await commands["setup"].handler("", { cwd: dir, ui: { notify: () => {} } });

		assert.ok(messages.length > 0, "should send a message");
		const msg = messages[0];
		assert.strictEqual(msg.msg.customType, "product-setup", "customType should be 'product-setup'");
		assert.strictEqual(msg.msg.display, true, "display should be true");
		assert.strictEqual(msg.opts.deliverAs, "followUp", "deliverAs should be 'followUp'");
		assert.strictEqual(msg.opts.triggerTurn, true, "triggerTurn should be true");
		assert.ok(msg.msg.content.includes("discovery"), "content should mention discovery skill");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	await test("/setup doesn't overwrite existing .gitignore", async () => {
		const dir = createTestProject();
		const customGitignore = "# My custom gitignore\n*.log\n";
		fs.writeFileSync(path.join(dir, ".gitignore"), customGitignore);

		const { pi, commands } = createMockPi();
		productSetup(pi as any);

		await commands["setup"].handler("", { cwd: dir, ui: { notify: () => {} } });

		const content = fs.readFileSync(path.join(dir, ".gitignore"), "utf-8");
		assert.strictEqual(content, customGitignore, ".gitignore should not be overwritten");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	console.log("\nIdempotency guard:");

	await test("/setup refuses to run in existing project (non-interactive)", async () => {
		const dir = createTestProject();
		const { pi, commands, messages } = createMockPi();
		productSetup(pi as any);

		// First run — should succeed
		await commands["setup"].handler("", { cwd: dir, ui: { notify: () => {} } });
		assert.ok(messages.length > 0, "first run should send a message");

		// Write something to AGENTS.md that would be lost on overwrite
		const agentsPath = path.join(dir, ".pi", "AGENTS.md");
		const originalContent = fs.readFileSync(agentsPath, "utf-8");
		fs.writeFileSync(agentsPath, originalContent + "\n## Product Context\nThis is my product.");

		// Second run (non-interactive, no hasUI) — should refuse silently
		messages.length = 0;
		await commands["setup"].handler("", {
			cwd: dir,
			ui: { notify: () => {} },
		});

		// Should NOT have sent a follow-up message (refused to run)
		assert.strictEqual(messages.length, 0, "second run should not send follow-up");

		// AGENTS.md should NOT be overwritten
		const afterContent = fs.readFileSync(agentsPath, "utf-8");
		assert.ok(afterContent.includes("This is my product."), "AGENTS.md should not be overwritten");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	await test("/setup resets when confirmed (interactive)", async () => {
		const dir = createTestProject();
		const { pi, commands, messages } = createMockPi();
		productSetup(pi as any);

		// First run
		await commands["setup"].handler("", { cwd: dir, ui: { notify: () => {} } });

		// Write a janitor state (active)
		const piDir = path.join(dir, ".pi");
		fs.writeFileSync(path.join(piDir, "janitor-state.json"), JSON.stringify({
			active: true, phase: "executing", buildCmds: [], testCmds: [],
			baselineErrors: 5, lastErrorCount: 0, currentStep: 1, totalSteps: 2,
			retriesOnStep: 0, planningRetries: 0, cycleCount: 0,
		}));

		// Second run (interactive, confirms reset)
		messages.length = 0;
		await commands["setup"].handler("", {
			cwd: dir,
			hasUI: true,
			ui: {
				notify: () => {},
				confirm: async () => true, // user confirms reset
			},
		});

		// Should have sent a follow-up message (reset succeeded)
		assert.ok(messages.length > 0, "reset run should send follow-up");

		// Janitor should be deactivated
		const jState = JSON.parse(fs.readFileSync(path.join(piDir, "janitor-state.json"), "utf-8"));
		assert.strictEqual(jState.active, false, "janitor should be deactivated");
		assert.strictEqual(jState.phase, "done", "janitor phase should be done");

		fs.rmSync(dir, { recursive: true, force: true });
	});

	await test("/setup deactivates janitor even without workflow-state", async () => {
		const dir = createTestProject();
		const { pi, commands, messages } = createMockPi();
		productSetup(pi as any);

		// No workflow-state, but janitor is active
		const piDir = path.join(dir, ".pi");
		fs.mkdirSync(piDir, { recursive: true });
		fs.writeFileSync(path.join(piDir, "janitor-state.json"), JSON.stringify({
			active: true, phase: "planning", buildCmds: [], testCmds: [],
			baselineErrors: 10, lastErrorCount: 10, currentStep: 0, totalSteps: 0,
			retriesOnStep: 0, planningRetries: 0, cycleCount: 0,
		}));

		// Run setup — should deactivate janitor and proceed
		const notifications: Array<{ msg: string; level: string }> = [];
		await commands["setup"].handler("", {
			cwd: dir,
			ui: { notify: (msg: string, level: string) => notifications.push({ msg, level }) },
		});

		// Should succeed (no workflow-state blocking it)
		assert.ok(messages.length > 0, "should proceed with setup");

		// Janitor should be deactivated
		const jState = JSON.parse(fs.readFileSync(path.join(piDir, "janitor-state.json"), "utf-8"));
		assert.strictEqual(jState.active, false, "janitor should be deactivated");

		// Should have notified about janitor deactivation
		assert.ok(
			notifications.some(n => n.msg.includes("Janitor desativado")),
			"should notify about janitor deactivation"
		);

		fs.rmSync(dir, { recursive: true, force: true });
	});

	// ─── SUMMARY ────────────────────────────────────────────────────────────

	console.log(`\n═══ Results: ${passCount}/${testCount} passed, ${failCount} failed ═══\n`);
	if (failCount > 0) process.exit(1);
}

runTests().catch((e) => {
	console.error("Test runner failed:", e);
	process.exit(1);
});
