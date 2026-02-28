/**
 * Janitor Extension — Codebase Stabilizer
 *
 * /janitor command that takes a broken or messy codebase and makes it
 * clean, compiling, and organized. Designed for brownfield projects
 * before the product system takes over.
 *
 * Phases:
 *   1. SCAN    — detect stack, run build, count errors (deterministic)
 *   2. PLAN    — agent creates .pi/janitor-plan.md
 *   3. EXECUTE — one step at a time, extension verifies after each
 *   4. VERIFY  — final check: all builds + tests pass
 *
 * The extension controls the loop. The agent executes and commits.
 * Verification is mechanical — the agent cannot declare completion.
 * Only the extension can, based on build exit codes and error counts.
 *
 * Separate from product-loop: different concern, different lifecycle,
 * different state file (.pi/janitor-state.json vs .pi/workflow-state.json).
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { compact } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "scanning" | "planning" | "executing" | "verifying" | "done";
type StepCategory = "clean" | "fix" | "organize";

interface JanitorStep {
	number: number;
	category: StepCategory;
	description: string;
}

interface JanitorState {
	active: boolean;
	phase: Phase;
	buildCmds: string[];
	testCmds: string[];
	baselineErrors: number;
	lastErrorCount: number;
	currentStep: number;
	totalSteps: number;
	retriesOnStep: number;
	planningRetries: number;
	cycleCount: number; // how many full plan→execute→verify cycles
}

// In-memory loop tracking (not persisted to file — survives via appendEntry)
interface LoopMeta {
	turnCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_STEP_RETRIES = 3;
const MAX_PLANNING_RETRIES = 3;
const MAX_CYCLES = 3; // full plan→execute→verify cycles before escalating
const STATE_FILE = "janitor-state.json";
const PLAN_FILE = "janitor-plan.md";
const LOOP_STATE_ENTRY = "janitor-loop-state";

const SKILL_PATH = "~/.pi/agent/skills/janitor/GUIDE.md";

// Max lines of build output to send to the agent (avoid flooding context)
const MAX_BUILD_OUTPUT_LINES = 200;

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function emptyState(): JanitorState {
	return {
		active: false,
		phase: "scanning",
		buildCmds: [],
		testCmds: [],
		baselineErrors: 0,
		lastErrorCount: 0,
		currentStep: 0,
		totalSteps: 0,
		retriesOnStep: 0,
		planningRetries: 0,
		cycleCount: 0,
	};
}

function readState(cwd: string): JanitorState | null {
	try {
		const raw = fs.readFileSync(path.join(cwd, ".pi", STATE_FILE), "utf-8");
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function writeState(cwd: string, state: JanitorState): void {
	const piDir = path.join(cwd, ".pi");
	if (!fs.existsSync(piDir)) fs.mkdirSync(piDir, { recursive: true });
	fs.writeFileSync(path.join(piDir, STATE_FILE), JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Stack detection
// ---------------------------------------------------------------------------

function detectStack(cwd: string): { buildCmds: string[]; testCmds: string[] } {
	const buildCmds: string[] = [];
	const testCmds: string[] = [];

	// Rust / Cargo — check root and one level deep (e.g. Tauri puts it in src-tauri/)
	const cargoRoot = findFile(cwd, "Cargo.toml");
	if (cargoRoot) {
		if (cargoRoot === cwd) {
			buildCmds.push("cargo build");
			testCmds.push("cargo test");
		} else {
			const relPath = path.relative(cwd, path.join(cargoRoot, "Cargo.toml"));
			buildCmds.push(`cargo build --manifest-path ${relPath}`);
			testCmds.push(`cargo test --manifest-path ${relPath}`);
		}
	}

	// Node / Frontend (pnpm > yarn > npm)
	if (fs.existsSync(path.join(cwd, "package.json"))) {
		try {
			const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
			const runner = fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))
				? "pnpm"
				: fs.existsSync(path.join(cwd, "yarn.lock"))
					? "yarn"
					: "npm run";
			if (pkg.scripts?.build) buildCmds.push(`${runner} build`);
			if (pkg.scripts?.test) testCmds.push(`${runner} test`);
		} catch { /* ignore malformed package.json */ }
	}

	// Go
	if (fs.existsSync(path.join(cwd, "go.mod"))) {
		buildCmds.push("go build ./...");
		testCmds.push("go test ./...");
	}

	// Python
	if (fs.existsSync(path.join(cwd, "pyproject.toml")) || fs.existsSync(path.join(cwd, "setup.py"))) {
		buildCmds.push("python -m compileall . -q");
		testCmds.push("python -m pytest -q");
	}

	// Java / Kotlin (Maven or Gradle)
	if (fs.existsSync(path.join(cwd, "pom.xml"))) {
		buildCmds.push("mvn compile -q");
		testCmds.push("mvn test -q");
	} else if (fs.existsSync(path.join(cwd, "build.gradle")) || fs.existsSync(path.join(cwd, "build.gradle.kts"))) {
		buildCmds.push("./gradlew build -x test -q");
		testCmds.push("./gradlew test -q");
	}

	// C/C++ (CMake or Make)
	if (fs.existsSync(path.join(cwd, "CMakeLists.txt"))) {
		buildCmds.push("cmake --build build");
		testCmds.push("ctest --test-dir build");
	} else if (fs.existsSync(path.join(cwd, "Makefile"))) {
		buildCmds.push("make");
	}

	// Swift (Package.swift)
	if (fs.existsSync(path.join(cwd, "Package.swift"))) {
		buildCmds.push("swift build");
		testCmds.push("swift test");
	}

	// Tauri — if tauri.conf.json exists, ensure both frontend and backend are covered
	const tauriConf = findFile(cwd, "tauri.conf.json");
	if (tauriConf && !buildCmds.some(c => c.includes("cargo"))) {
		if (fs.existsSync(path.join(tauriConf, "Cargo.toml"))) {
			const relPath = path.relative(cwd, path.join(tauriConf, "Cargo.toml"));
			buildCmds.push(`cargo build --manifest-path ${relPath}`);
			testCmds.push(`cargo test --manifest-path ${relPath}`);
		}
	}

	return { buildCmds, testCmds };
}

/**
 * Find a file in cwd or one level deep in subdirectories.
 * Returns the directory containing the file, or null.
 */
function findFile(cwd: string, filename: string): string | null {
	// Check root first
	if (fs.existsSync(path.join(cwd, filename))) return cwd;

	// Check one level deep
	try {
		const entries = fs.readdirSync(cwd, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "target") {
				if (fs.existsSync(path.join(cwd, entry.name, filename))) {
					return path.join(cwd, entry.name);
				}
			}
		}
	} catch { /* ignore readdir errors */ }

	return null;
}

// ---------------------------------------------------------------------------
// Build execution & error counting
// ---------------------------------------------------------------------------

async function runBuildCommands(
	pi: ExtensionAPI,
	cmds: string[],
): Promise<{ totalErrors: number; output: string; allPassed: boolean }> {
	let totalErrors = 0;
	const outputs: string[] = [];
	let allPassed = true;

	for (const cmd of cmds) {
		const parts = cmd.split(/\s+/);
		const result = await pi.exec(parts[0], parts.slice(1));
		const combined = (result.stderr + "\n" + result.stdout).trim();
		const errors = countErrors(combined);
		totalErrors += errors;
		if (result.code !== 0) allPassed = false;

		outputs.push(`$ ${cmd}\nExit code: ${result.code}\nErrors found: ${errors}\n${truncateOutput(combined)}`);
	}

	return { totalErrors, output: outputs.join("\n\n---\n\n"), allPassed };
}

async function runTestCommands(
	pi: ExtensionAPI,
	cmds: string[],
): Promise<{ allPassed: boolean; output: string }> {
	const outputs: string[] = [];
	let allPassed = true;

	for (const cmd of cmds) {
		const parts = cmd.split(/\s+/);
		const result = await pi.exec(parts[0], parts.slice(1));
		if (result.code !== 0) allPassed = false;
		const combined = (result.stderr + "\n" + result.stdout).trim();
		outputs.push(`$ ${cmd}\nExit code: ${result.code}\n${truncateOutput(combined)}`);
	}

	return { allPassed, output: outputs.join("\n\n---\n\n") };
}

function countErrors(output: string): number {
	return extractErrorLines(output).length;
}

/**
 * Rough error counting for mechanical verification.
 * NOT meant to be exhaustive — the LLM handles detailed error extraction.
 * This just gives the extension a number to track progress between steps.
 */
function extractErrorLines(output: string): string[] {
	const errors: string[] = [];
	const lines = output.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim();

		// Universal: most compilers prefix error lines with "error"
		// Catches: Rust, C/C++, Swift, Java, TypeScript, Go, and most others
		if (/^error[\[:\s(]/i.test(trimmed)) {
			errors.push(trimmed);
		}
	}

	// If no "error" lines found, check for compiler summary lines
	// e.g. "2 errors generated", "Found 5 errors", "BUILD FAILED"
	if (errors.length === 0) {
		for (const line of lines) {
			const match = line.match(/(\d+)\s+errors?\b/i);
			if (match) {
				const n = parseInt(match[1], 10);
				// Return synthetic error entries so countErrors works
				for (let i = 0; i < n; i++) errors.push(`error: (counted from summary)`);
				break;
			}
		}
	}

	return errors;
}

/**
 * Format errors as a numbered list for the agent.
 * This makes it impossible to "miss" errors — they're explicitly counted.
 */
function truncateOutput(output: string): string {
	const lines = output.split("\n");
	if (lines.length <= MAX_BUILD_OUTPUT_LINES) return output;
	const half = Math.floor(MAX_BUILD_OUTPUT_LINES / 2);
	const skipped = lines.length - MAX_BUILD_OUTPUT_LINES;
	return [
		...lines.slice(0, half),
		`\n... (${skipped} lines omitted) ...\n`,
		...lines.slice(-half),
	].join("\n");
}

// ---------------------------------------------------------------------------
// Plan parsing
// ---------------------------------------------------------------------------

function readPlan(cwd: string): string | null {
	// Primary: .pi/janitor-plan.md
	const primary = path.join(cwd, ".pi", PLAN_FILE);
	try {
		return fs.readFileSync(primary, "utf-8");
	} catch { /* not found */ }

	// Fallback: agents sometimes write to project root instead of .pi/
	const fallback = path.join(cwd, PLAN_FILE);
	try {
		const content = fs.readFileSync(fallback, "utf-8");
		// Move it to the correct location
		fs.mkdirSync(path.join(cwd, ".pi"), { recursive: true });
		fs.writeFileSync(primary, content, "utf-8");
		fs.unlinkSync(fallback);
		return content;
	} catch { /* not found either */ }

	return null;
}

function parseSteps(planContent: string): JanitorStep[] {
	const steps: JanitorStep[] = [];
	const regex = /^(\d+)\.\s*\[(clean|fix|organize)\]\s+(.+)$/gm;
	let match;
	while ((match = regex.exec(planContent)) !== null) {
		steps.push({
			number: parseInt(match[1], 10),
			category: match[2] as StepCategory,
			description: match[3].trim(),
		});
	}
	return steps;
}

function getStep(cwd: string, stepNumber: number): JanitorStep | null {
	const plan = readPlan(cwd);
	if (!plan) return null;
	const steps = parseSteps(plan);
	return steps.find((s) => s.number === stepNumber) ?? null;
}

// ---------------------------------------------------------------------------
// Plan coverage validation
// ---------------------------------------------------------------------------

interface PlanValidation {
	valid: boolean;
	steps: number;
	estimatedImpact: number;
	baselineErrors: number;
	reason?: string;
}

function validatePlanCoverage(planContent: string, baselineErrors: number): PlanValidation {
	const steps = parseSteps(planContent);

	if (steps.length === 0) {
		return { valid: false, steps: 0, estimatedImpact: 0, baselineErrors, reason: "No steps found in plan." };
	}

	// Parse Impact lines: "Impact: Resolves ~N errors" or "Impact: Resolves N errors"
	let estimatedImpact = 0;
	let hasImpactLines = false;
	const impactRegex = /^\s*Impact:\s*Resolves?\s*~?(\d+)\s*error/gmi;
	let match;
	while ((match = impactRegex.exec(planContent)) !== null) {
		estimatedImpact += parseInt(match[1], 10);
		hasImpactLines = true;
	}

	// Also check for the Coverage line at bottom
	const coverageRegex = /^\s*##\s*Coverage:\s*(\d+)\s*\/\s*(\d+)/mi;
	const coverageMatch = coverageRegex.exec(planContent);

	// If build already passes (0 errors), any plan with steps is valid (organize-only mode)
	if (baselineErrors === 0) {
		return { valid: true, steps: steps.length, estimatedImpact: 0, baselineErrors: 0 };
	}

	// If no Impact lines at all, the plan is incomplete
	if (!hasImpactLines) {
		return {
			valid: false,
			steps: steps.length,
			estimatedImpact: 0,
			baselineErrors,
			reason: `Plan has ${steps.length} steps but no Impact lines. Every step must have an "Impact: Resolves ~N errors" line so the janitor can verify coverage.`,
		};
	}

	// Check coverage: estimated impact should cover at least 70% of baseline errors
	// (allowing for secondary/cascading errors that resolve automatically)
	const coverageRatio = estimatedImpact / baselineErrors;
	if (coverageRatio < 0.7) {
		return {
			valid: false,
			steps: steps.length,
			estimatedImpact,
			baselineErrors,
			reason: `Plan estimates fixing ~${estimatedImpact} errors but there are ${baselineErrors}. That's only ${Math.round(coverageRatio * 100)}% coverage. You're missing root causes — read the build output again and account for ALL errors.`,
		};
	}

	return { valid: true, steps: steps.length, estimatedImpact, baselineErrors };
}

// ---------------------------------------------------------------------------
// Verification logic
// ---------------------------------------------------------------------------

interface VerifyResult {
	passed: boolean;
	reason: string;
	newErrorCount: number;
}

function verifyStep(
	category: StepCategory,
	errorsBefore: number,
	errorsAfter: number,
	buildPassed: boolean,
): VerifyResult {
	switch (category) {
		case "clean":
			// Clean should not INCREASE errors
			if (errorsAfter > errorsBefore) {
				return {
					passed: false,
					reason: `Error count increased from ${errorsBefore} to ${errorsAfter} after cleanup. The removal broke something.`,
					newErrorCount: errorsAfter,
				};
			}
			return { passed: true, reason: "Clean step OK", newErrorCount: errorsAfter };

		case "fix":
			// Fix MUST decrease errors (or build must now pass)
			if (buildPassed && errorsAfter === 0) {
				return { passed: true, reason: "Build passes", newErrorCount: 0 };
			}
			if (errorsAfter >= errorsBefore) {
				return {
					passed: false,
					reason: `Error count did not decrease. Before: ${errorsBefore}. After: ${errorsAfter}. The fix had no effect.`,
					newErrorCount: errorsAfter,
				};
			}
			return {
				passed: true,
				reason: `Errors decreased from ${errorsBefore} to ${errorsAfter}`,
				newErrorCount: errorsAfter,
			};

		case "organize":
			// Organize must NOT break anything
			if (errorsAfter > errorsBefore) {
				return {
					passed: false,
					reason: `Error count increased from ${errorsBefore} to ${errorsAfter} after reorganization. Revert and try differently.`,
					newErrorCount: errorsAfter,
				};
			}
			return { passed: true, reason: "Organize step OK — build still clean", newErrorCount: errorsAfter };
	}
}

// ---------------------------------------------------------------------------
// Follow-up messages
// ---------------------------------------------------------------------------

function planningFollowUp(state: JanitorState, buildOutput: string, testOutput: string | null): string {
	const roughCount = extractErrorLines(buildOutput).length;
	const parts: string[] = [];

	parts.push(`Read ${SKILL_PATH} for the plan format and rules.`);
	parts.push("");
	parts.push(`## Project scan results`);
	parts.push(`Build commands: ${state.buildCmds.join(", ")}`);
	parts.push(`Test commands: ${state.testCmds.length > 0 ? state.testCmds.join(", ") : "(none detected)"}`);
	parts.push(`Approximate error count: ${roughCount} (you must verify by reading the output)`);
	parts.push("");

	// --- Build output ---
	parts.push("## Build output");
	parts.push("```");
	parts.push(truncateOutput(buildOutput));
	parts.push("```");
	parts.push("");

	// --- Test results ---
	if (testOutput) {
		parts.push("## Test output");
		parts.push("```");
		parts.push(truncateOutput(testOutput));
		parts.push("```");
		parts.push("");
	}

	// --- Instructions: tell the LLM what to do, not what the errors are ---
	parts.push("## Your task");
	parts.push("");
	parts.push("Create `.pi/janitor-plan.md` that addresses ALL build/test failures.");
	parts.push("");
	parts.push("Before writing the plan:");
	parts.push("1. Read the ENTIRE build output above — every line");
	parts.push("2. Extract and count every distinct error yourself");
	parts.push("3. For each error, read the ACTUAL SOURCE FILE to understand the root cause");
	parts.push("4. Group errors by root cause — one fix may resolve many errors");
	parts.push("5. For each step, state how many errors it resolves (Impact line)");
	parts.push("6. Verify: does the sum of all Impact lines cover all errors? If not, you missed something.");
	parts.push("");
	parts.push("Also look for: dead code, unused dependencies, code duplication, mismatched contracts.");
	parts.push("Order: Clean first → Fix second → Organize last.");

	return parts.join("\n");
}

function planningRetryFollowUp(attempt: number): string {
	return [
		`The file .pi/janitor-plan.md was not found or has no valid steps.`,
		`Attempt ${attempt}/${MAX_PLANNING_RETRIES}.`,
		"",
		`Read ${SKILL_PATH} and create .pi/janitor-plan.md with numbered steps in the format:`,
		"```",
		"1. [clean] Description",
		"2. [fix] Description",
		"3. [organize] Description",
		"```",
	].join("\n");
}

function executeStepFollowUp(step: JanitorStep, state: JanitorState): string {
	return [
		`**Step ${step.number} of ${state.totalSteps}** [${step.category}]`,
		"",
		step.description,
		"",
		`Current error count: ${state.lastErrorCount}`,
		"",
		"1. Make the changes for this step",
		`2. Run the build: \`${state.buildCmds[0] || "cargo build"}\``,
		"3. If build fails, fix it before committing",
		`4. Commit: \`git add -A && git commit -m "${step.category === "clean" ? "chore" : step.category === "fix" ? "fix" : "refactor"}: <what you did>"\``,
		"",
		"Do NOT commit without running the build first. I will verify after you.",
	].join("\n");
}

function retryStepFollowUp(step: JanitorStep, verify: VerifyResult, attempt: number, buildOutput: string): string {
	return [
		`**Step ${step.number} — retry ${attempt}/${MAX_STEP_RETRIES}**`,
		"",
		`❌ ${verify.reason}`,
		"",
		"Try a different approach. The build output after your last attempt:",
		"```",
		buildOutput,
		"```",
	].join("\n");
}

function escalateFollowUp(step: JanitorStep): string {
	return [
		`⚠️ Step ${step.number} failed after ${MAX_STEP_RETRIES} attempts.`,
		"",
		`Step: [${step.category}] ${step.description}`,
		"",
		"Escalate to the operator using the ask tool.",
		"Describe the problem in product language — what's blocking progress, not technical details.",
		"Offer 3 options: skip this step, try a completely different approach, stop the janitor.",
	].join("\n");
}

function verifyPhaseFollowUp(buildResult: { allPassed: boolean; output: string }, testResult: { allPassed: boolean; output: string } | null): string {
	const parts: string[] = ["**Final verification:**"];

	parts.push(`Build: ${buildResult.allPassed ? "✅" : "❌"}`);
	if (testResult) {
		parts.push(`Tests: ${testResult.allPassed ? "✅" : "❌"}`);
	}

	if (buildResult.allPassed && (!testResult || testResult.allPassed)) {
		parts.push("");
		parts.push("All checks pass. Write `.pi/janitor-triage.md` following the format in the skill.");
		parts.push("The project is ready for `/setup`.");
	} else {
		parts.push("");
		parts.push("Some checks still failing. Output:");
		if (!buildResult.allPassed) {
			parts.push("```");
			parts.push(buildResult.output);
			parts.push("```");
		}
		if (testResult && !testResult.allPassed) {
			parts.push("Test output:");
			parts.push("```");
			parts.push(testResult.output);
			parts.push("```");
		}
		parts.push("");
		parts.push("Create additional steps in janitor-plan.md to address these remaining issues.");
	}

	return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

function updateWidget(ctx: ExtensionContext, state: JanitorState | null, meta: LoopMeta): void {
	if (!ctx.hasUI) return;

	if (!state?.active) {
		ctx.ui.setWidget("janitor", undefined);
		return;
	}

	let text = "";
	switch (state.phase) {
		case "scanning":
			text = "🔍 Janitor: scanning...";
			break;
		case "planning":
			text = "📋 Janitor: waiting for plan";
			break;
		case "executing":
			text = `🔧 Janitor: step ${state.currentStep}/${state.totalSteps} — ${state.lastErrorCount} errors (turn ${meta.turnCount})`;
			break;
		case "verifying":
			text = "✅ Janitor: final verification";
			break;
		case "done":
			text = "✅ Janitor: done";
			break;
	}

	if (text) {
		ctx.ui.setWidget("janitor", (_tui, theme) => {
			const { Text } = require("@mariozechner/pi-tui");
			return new Text(theme.fg("accent", text), 0, 0);
		});
	}
}

// ---------------------------------------------------------------------------
// Abort detection
// ---------------------------------------------------------------------------

function wasLastAssistantAborted(messages: Array<{ role?: string; stopReason?: string }>): boolean {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i]?.role === "assistant") {
			return messages[i]?.stopReason === "aborted";
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function janitorExtension(pi: ExtensionAPI): void {
	let meta: LoopMeta = { turnCount: 0 };
	let lastBuildOutput = "";

	function sendFollowUp(content: string, triggerTurn: boolean = true): void {
		pi.sendMessage(
			{ customType: "janitor", content, display: true },
			{ deliverAs: "followUp", triggerTurn },
		);
	}

	function persistMeta(): void {
		pi.appendEntry(LOOP_STATE_ENTRY, meta);
	}

	function loadMeta(ctx: ExtensionContext): LoopMeta {
		const entries = ctx.sessionManager.getEntries();
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i] as { type: string; customType?: string; data?: LoopMeta };
			if (entry.type === "custom" && entry.customType === LOOP_STATE_ENTRY && entry.data) {
				return { ...entry.data };
			}
		}
		return { turnCount: 0 };
	}

	// --- /janitor command ---
	pi.registerCommand("janitor", {
		description: "Stabilize a broken or messy codebase (fix, clean, organize)",
		handler: async (_args, ctx) => {
			// Check if already active
			const existing = readState(ctx.cwd);
			if (existing?.active) {
				if (ctx.hasUI) {
					const stop = await ctx.ui.confirm(
						"Janitor já está ativo",
						"Quer reiniciar o janitor do zero?",
					);
					if (!stop) {
						ctx.ui.notify("Janitor continua ativo", "info");
						return;
					}
				}
			}

			// Check if product-loop is active (don't mix concerns)
			const wsPath = path.join(ctx.cwd, ".pi", "workflow-state.json");
			if (fs.existsSync(wsPath)) {
				try {
					const ws = JSON.parse(fs.readFileSync(wsPath, "utf-8"));
					if (ws.currentPhase && ws.currentPhase !== "init" && ws.currentPhase !== "done") {
						ctx.ui.notify(
							"O product-loop está ativo. Termine ou resete o workflow antes de rodar o janitor.",
							"warning",
						);
						return;
					}
				} catch { /* ignore parse errors */ }
			}

			ctx.ui.notify("Janitor: scanning project...", "info");

			// 1. Detect stack
			const stack = detectStack(ctx.cwd);
			if (stack.buildCmds.length === 0) {
				ctx.ui.notify(
					"Nenhum build command detectado. Supported: Cargo.toml, package.json, go.mod, pyproject.toml, pom.xml, build.gradle, CMakeLists.txt, Makefile, Package.swift.",
					"error",
				);
				return;
			}

			// 2. Run build commands
			const buildResult = await runBuildCommands(pi, stack.buildCmds);
			lastBuildOutput = buildResult.output;

			// 2b. Also run tests (so agent sees ALL issues upfront, not just build errors)
			let testOutput: string | null = null;
			if (stack.testCmds.length > 0) {
				const testResult = await runTestCommands(pi, stack.testCmds);
				if (!testResult.allPassed) {
					testOutput = testResult.output;
				}
			}

			// 3. Initialize state
			const state: JanitorState = {
				active: true,
				phase: "planning",
				buildCmds: stack.buildCmds,
				testCmds: stack.testCmds,
				baselineErrors: buildResult.totalErrors,
				lastErrorCount: buildResult.totalErrors,
				currentStep: 0,
				totalSteps: 0,
				retriesOnStep: 0,
				planningRetries: 0,
				cycleCount: 0,
			};
			writeState(ctx.cwd, state);

			meta = { turnCount: 0 };
			persistMeta();
			updateWidget(ctx, state, meta);

			ctx.ui.notify(
				`Janitor: ${buildResult.totalErrors} build errors found. Stack: ${stack.buildCmds.join(", ")}`,
				"info",
			);

			// 4. Send planning follow-up
			if (buildResult.totalErrors === 0 && buildResult.allPassed) {
				// Build already passes — skip to organize-only mode
				state.phase = "planning";
				writeState(ctx.cwd, state);
				sendFollowUp([
					`Read ${SKILL_PATH} for instructions.`,
					"",
					"Build already passes with 0 errors. Focus the plan on **organize** steps only:",
					"- Dead code removal [clean]",
					"- Code duplication [organize]",
					"- Documentation accuracy [organize]",
					"- Contract alignment between modules [organize]",
					"",
					"Create `.pi/janitor-plan.md` with your findings.",
				].join("\n"));
			} else {
				sendFollowUp(planningFollowUp(state, buildResult.output, testOutput));
			}
		},
	});

	// --- agent_end: core loop ---
	pi.on("agent_end", async (event, ctx) => {
		const state = readState(ctx.cwd);
		if (!state?.active) return;

		// Respect operator input
		if (ctx.hasPendingMessages()) return;

		// Abort detection
		if (ctx.hasUI && wasLastAssistantAborted(event.messages as any)) {
			const stop = await ctx.ui.confirm(
				"Parar o janitor?",
				"Operação interrompida. Quer parar o janitor?",
			);
			if (stop) {
				state.active = false;
				writeState(ctx.cwd, state);
				updateWidget(ctx, state, meta);
				ctx.ui.notify("Janitor parado", "info");
				return;
			}
		}

		meta.turnCount++;
		persistMeta();

		// --- Phase: PLANNING ---
		if (state.phase === "planning") {
			const plan = readPlan(ctx.cwd);
			const steps = plan ? parseSteps(plan) : [];

			if (steps.length === 0) {
				state.planningRetries++;
				if (state.planningRetries >= MAX_PLANNING_RETRIES) {
					state.active = false;
					writeState(ctx.cwd, state);
					updateWidget(ctx, state, meta);
					ctx.ui.notify("Janitor: agente não criou o plano após 3 tentativas. Parado.", "error");
					return;
				}
				writeState(ctx.cwd, state);
				sendFollowUp(planningRetryFollowUp(state.planningRetries));
				return;
			}

			// Validate plan coverage — reject incomplete plans
			const validation = validatePlanCoverage(plan!, state.baselineErrors);
			if (!validation.valid) {
				state.planningRetries++;
				if (state.planningRetries >= MAX_PLANNING_RETRIES) {
					// Accept incomplete plan after max retries rather than stopping
					if (ctx.hasUI) {
						ctx.ui.notify(`Janitor: plan incomplete (${validation.reason}) but proceeding after ${MAX_PLANNING_RETRIES} attempts.`, "warning");
					}
				} else {
					writeState(ctx.cwd, state);
					sendFollowUp([
						`**Plan rejected — incomplete coverage.**`,
						"",
						validation.reason || "The plan doesn't account for all errors.",
						"",
						`Attempt ${state.planningRetries}/${MAX_PLANNING_RETRIES}. Fix the plan:`,
						`1. Re-read EVERY error in the build output`,
						`2. Read the actual source files to understand root causes`,
						`3. Add missing steps with Impact lines`,
						`4. Verify the sum of Impact lines >= ${state.baselineErrors}`,
						"",
						`Update \`.pi/janitor-plan.md\` — don't start over, just add what's missing.`,
					].join("\n"));
					return;
				}
			}

			// Plan is valid (or accepted after max retries) — transition to executing
			state.phase = "executing";
			state.totalSteps = steps.length;
			state.currentStep = steps[0].number;
			state.retriesOnStep = 0;
			writeState(ctx.cwd, state);
			updateWidget(ctx, state, meta);

			const firstStep = steps[0];
			sendFollowUp(executeStepFollowUp(firstStep, state));
			return;
		}

		// --- Phase: EXECUTING ---
		if (state.phase === "executing") {
			// Run build to verify the step
			const buildResult = await runBuildCommands(pi, state.buildCmds);
			lastBuildOutput = buildResult.output;

			const step = getStep(ctx.cwd, state.currentStep);
			if (!step) {
				// Current step not found in plan — might have been re-planned
				// Re-read and find next unfinished step
				const plan = readPlan(ctx.cwd);
				const steps = plan ? parseSteps(plan) : [];
				if (steps.length === 0) {
					state.phase = "verifying";
					writeState(ctx.cwd, state);
					// Fall through to verify
				} else {
					state.currentStep = steps[0].number;
					state.totalSteps = steps.length;
					writeState(ctx.cwd, state);
					sendFollowUp(executeStepFollowUp(steps[0], state));
					return;
				}
			}

			if (step) {
				const verify = verifyStep(
					step.category,
					state.lastErrorCount,
					buildResult.totalErrors,
					buildResult.allPassed,
				);

				if (verify.passed) {
					// Step passed — advance
					state.lastErrorCount = verify.newErrorCount;
					state.retriesOnStep = 0;

					// Find next step
					const plan = readPlan(ctx.cwd);
					const steps = plan ? parseSteps(plan) : [];
					const currentIdx = steps.findIndex((s) => s.number === state.currentStep);
					const nextStep = currentIdx >= 0 && currentIdx < steps.length - 1
						? steps[currentIdx + 1]
						: null;

					// Find the next step that actually needs work
					let stepToExecute: JanitorStep | null = null;
					const remainingSteps = steps.slice(currentIdx + 1);

					if (buildResult.allPassed && state.lastErrorCount === 0) {
						// Build passes — skip remaining fix steps, only execute clean/organize
						stepToExecute = remainingSteps.find(s => s.category !== "fix") ?? null;
					} else if (remainingSteps.length > 0) {
						stepToExecute = remainingSteps[0];
					}

					if (stepToExecute) {
						state.currentStep = stepToExecute.number;
						writeState(ctx.cwd, state);
						updateWidget(ctx, state, meta);
						sendFollowUp(executeStepFollowUp(stepToExecute, state));
						return;
					} else {
						// All steps done (or skipped) — verify
						state.phase = "verifying";
						writeState(ctx.cwd, state);
						updateWidget(ctx, state, meta);
						// Fall through to verify
					}
				} else {
					// Step failed
					state.retriesOnStep++;
					state.lastErrorCount = verify.newErrorCount;

					if (state.retriesOnStep >= MAX_STEP_RETRIES) {
						writeState(ctx.cwd, state);
						updateWidget(ctx, state, meta);
						sendFollowUp(escalateFollowUp(step));
						return;
					}

					writeState(ctx.cwd, state);
					updateWidget(ctx, state, meta);
					sendFollowUp(retryStepFollowUp(step, verify, state.retriesOnStep, buildResult.output));
					return;
				}
			}
		}

		// --- Phase: VERIFYING ---
		if (state.phase === "verifying") {
			const buildResult = await runBuildCommands(pi, state.buildCmds);
			let testResult: { allPassed: boolean; output: string } | null = null;

			if (buildResult.allPassed && state.testCmds.length > 0) {
				testResult = await runTestCommands(pi, state.testCmds);
			}

			const allGreen = buildResult.allPassed && (!testResult || testResult.allPassed);

			if (allGreen) {
				state.phase = "done";
				state.lastErrorCount = 0;
				writeState(ctx.cwd, state);
				updateWidget(ctx, state, meta);
				sendFollowUp(verifyPhaseFollowUp(buildResult, testResult));
			} else {
				// Back to planning with remaining issues
				state.cycleCount++;

				if (state.cycleCount >= MAX_CYCLES) {
					// Too many full cycles — escalate
					state.active = false;
					writeState(ctx.cwd, state);
					updateWidget(ctx, state, meta);
					sendFollowUp([
						`⚠️ Janitor ran ${MAX_CYCLES} full cycles (plan→execute→verify) but the build still fails.`,
						"",
						`Remaining errors: ${buildResult.totalErrors}`,
						"",
						"Escalate to the operator using the ask tool.",
						"Explain what's still broken and ask whether to: try again, fix manually, or stop.",
					].join("\n"));
					return;
				}

				state.phase = "planning";
				state.lastErrorCount = buildResult.totalErrors;
				state.planningRetries = 0;
				writeState(ctx.cwd, state);
				updateWidget(ctx, state, meta);
				sendFollowUp(verifyPhaseFollowUp(buildResult, testResult));
			}
			return;
		}

		// --- Phase: DONE ---
		if (state.phase === "done") {
			// Check if triage was written
			const triagePath = path.join(ctx.cwd, ".pi", "janitor-triage.md");
			if (fs.existsSync(triagePath)) {
				state.active = false;
				writeState(ctx.cwd, state);
				updateWidget(ctx, state, meta);
				if (ctx.hasUI) {
					ctx.ui.notify("✅ Janitor completo. Projeto pronto pro /setup.", "info");
				}
			}
			// If triage not written yet, don't send another follow-up — the previous one already asked for it
		}
	});

	// --- Compaction: preserve janitor context ---
	pi.on("session_before_compact", async (event, ctx) => {
		const state = readState(ctx.cwd);
		if (!state?.active) return;
		if (!ctx.model) return;

		const apiKey = await ctx.modelRegistry.getApiKey(ctx.model);
		if (!apiKey) return;

		const step = getStep(ctx.cwd, state.currentStep);
		const instructions = [
			`Janitor active. Phase: ${state.phase}. Step: ${state.currentStep}/${state.totalSteps}.`,
			`Build errors: ${state.lastErrorCount} (baseline: ${state.baselineErrors}).`,
			`Cycle: ${state.cycleCount}/${MAX_CYCLES}. Retries on current step: ${state.retriesOnStep}/${MAX_STEP_RETRIES}.`,
			step ? `Current step: [${step.category}] ${step.description}` : "",
			"After compaction, continue from where you left off.",
			"Read .pi/janitor-state.json and .pi/janitor-plan.md for current state.",
		].filter(Boolean).join("\n");

		const combined = [event.customInstructions, instructions].filter(Boolean).join("\n\n");

		try {
			const compaction = await compact(event.preparation, ctx.model, apiKey, combined, event.signal);
			return { compaction };
		} catch (error) {
			if (ctx.hasUI) {
				const msg = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Janitor compaction failed: ${msg}`, "warning");
			}
		}
	});

	// --- Session start: restore and resume ---
	pi.on("session_start", async (_event, ctx) => {
		meta = loadMeta(ctx);

		const state = readState(ctx.cwd);
		if (!state?.active) {
			updateWidget(ctx, null, meta);
			return;
		}

		updateWidget(ctx, state, meta);

		// Resume: send appropriate follow-up based on phase
		if (state.phase === "planning") {
			sendFollowUp(
				lastBuildOutput
					? planningFollowUp(state, lastBuildOutput, null)
					: `Janitor active — phase: planning. Create .pi/janitor-plan.md. Read ${SKILL_PATH} for instructions.`,
			);
		} else if (state.phase === "executing") {
			const step = getStep(ctx.cwd, state.currentStep);
			if (step) {
				sendFollowUp(executeStepFollowUp(step, state));
			}
		} else if (state.phase === "verifying") {
			// Re-run verification
			sendFollowUp("Janitor resuming — running final verification...");
		}
	});

	// --- Session switch: restore ---
	pi.on("session_switch", async (_event, ctx) => {
		meta = loadMeta(ctx);
		const state = readState(ctx.cwd);
		updateWidget(ctx, state, meta);
	});
}
