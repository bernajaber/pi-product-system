/**
 * Unit tests for janitor.ts extension
 *
 * Tests the janitor's logic without requiring a running pi session:
 * - Stack detection
 * - Error counting
 * - Plan parsing
 * - Step verification
 * - State transitions
 * - Follow-up message content
 */

import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ---------------------------------------------------------------------------
// Extract testable functions from the extension
// We re-implement the pure functions here since the extension exports a single
// default function. This tests the LOGIC, not the wiring.
// ---------------------------------------------------------------------------

// --- countErrors / extractErrorLines ---
// Mirrors the universal approach: rough counting, not language-specific
function extractErrorLines(output: string): string[] {
	const errors: string[] = [];
	const lines = output.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const trimmed = lines[i].trim();
		if (/^error[\[:\s(]/i.test(trimmed)) {
			errors.push(trimmed);
		}
	}
	if (errors.length === 0) {
		for (const line of lines) {
			const match = line.match(/(\d+)\s+errors?\b/i);
			if (match) {
				const n = parseInt(match[1], 10);
				for (let i = 0; i < n; i++) errors.push("error: (counted from summary)");
				break;
			}
		}
	}
	return errors;
}

function countErrors(output: string): number {
	return extractErrorLines(output).length;
}

// --- parseSteps ---
type StepCategory = "clean" | "fix" | "organize";
interface JanitorStep {
	number: number;
	category: StepCategory;
	description: string;
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

// --- verifyStep ---
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
			if (errorsAfter > errorsBefore) {
				return {
					passed: false,
					reason: `Error count increased from ${errorsBefore} to ${errorsAfter} after cleanup. The removal broke something.`,
					newErrorCount: errorsAfter,
				};
			}
			return { passed: true, reason: "Clean step OK", newErrorCount: errorsAfter };

		case "fix":
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

// --- detectStack ---
function findFile(cwd: string, filename: string): string | null {
	if (fs.existsSync(path.join(cwd, filename))) return cwd;
	try {
		const entries = fs.readdirSync(cwd, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "target") {
				if (fs.existsSync(path.join(cwd, entry.name, filename))) {
					return path.join(cwd, entry.name);
				}
			}
		}
	} catch { /* ignore */ }
	return null;
}

function detectStack(cwd: string): { buildCmds: string[]; testCmds: string[] } {
	const buildCmds: string[] = [];
	const testCmds: string[] = [];

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
		} catch { /* ignore */ }
	}

	if (fs.existsSync(path.join(cwd, "go.mod"))) {
		buildCmds.push("go build ./...");
		testCmds.push("go test ./...");
	}

	if (fs.existsSync(path.join(cwd, "pyproject.toml")) || fs.existsSync(path.join(cwd, "setup.py"))) {
		buildCmds.push("python -m compileall . -q");
		testCmds.push("python -m pytest -q");
	}

	if (fs.existsSync(path.join(cwd, "pom.xml"))) {
		buildCmds.push("mvn compile -q");
		testCmds.push("mvn test -q");
	} else if (fs.existsSync(path.join(cwd, "build.gradle")) || fs.existsSync(path.join(cwd, "build.gradle.kts"))) {
		buildCmds.push("./gradlew build -x test -q");
		testCmds.push("./gradlew test -q");
	}

	if (fs.existsSync(path.join(cwd, "CMakeLists.txt"))) {
		buildCmds.push("cmake --build build");
		testCmds.push("ctest --test-dir build");
	} else if (fs.existsSync(path.join(cwd, "Makefile"))) {
		buildCmds.push("make");
	}

	if (fs.existsSync(path.join(cwd, "Package.swift"))) {
		buildCmds.push("swift build");
		testCmds.push("swift test");
	}

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

// --- validatePlanCoverage ---
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
	let estimatedImpact = 0;
	let hasImpactLines = false;
	const impactRegex = /^\s*Impact:\s*Resolves?\s*~?(\d+)\s*error/gmi;
	let match;
	while ((match = impactRegex.exec(planContent)) !== null) {
		estimatedImpact += parseInt(match[1], 10);
		hasImpactLines = true;
	}
	if (baselineErrors === 0) {
		return { valid: true, steps: steps.length, estimatedImpact: 0, baselineErrors: 0 };
	}
	if (!hasImpactLines) {
		return {
			valid: false, steps: steps.length, estimatedImpact: 0, baselineErrors,
			reason: `Plan has ${steps.length} steps but no Impact lines.`,
		};
	}
	const coverageRatio = estimatedImpact / baselineErrors;
	if (coverageRatio < 0.7) {
		return {
			valid: false, steps: steps.length, estimatedImpact, baselineErrors,
			reason: `Plan estimates fixing ~${estimatedImpact} errors but there are ${baselineErrors}.`,
		};
	}
	return { valid: true, steps: steps.length, estimatedImpact, baselineErrors };
}

// --- truncateOutput ---
const MAX_BUILD_OUTPUT_LINES = 80;

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
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
	try {
		fn();
		console.log(`  ✅ ${name}`);
		passed++;
	} catch (e: any) {
		console.log(`  ❌ ${name}`);
		console.log(`     ${e.message}`);
		failed++;
	}
}

function section(name: string): void {
	console.log(`\n${name}:`);
}

// ---------------------------------------------------------------------------
// Temp directory helper
// ---------------------------------------------------------------------------

function makeTempDir(): string {
	return fs.mkdtempSync(path.join(os.tmpdir(), "janitor-test-"));
}

function cleanup(dir: string): void {
	fs.rmSync(dir, { recursive: true, force: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log("═══ Janitor Extension Tests ═══");

// --- Error Counting ---

section("countErrors");

test("counts Rust errors with error codes", () => {
	const output = `
error[E0433]: failed to resolve: use of undeclared crate
error[E0412]: cannot find type \`NSError\` in this scope
warning: unused import
error: aborting due to 2 previous errors
`;
	assert.strictEqual(countErrors(output), 3);
});

test("counts generic Error: lines", () => {
	const output = `
Error: Cannot find module 'react'
Some other line
Error: something else failed
`;
	assert.strictEqual(countErrors(output), 2);
});

test("falls back to summary line when no error prefix found", () => {
	// Python, Go, and other compilers may not prefix with "error"
	// but often print a summary like "Found 3 errors"
	const output = `
SyntaxError: invalid syntax
  File "main.py", line 5
IndentationError: unexpected indent
Found 3 errors
`;
	assert.strictEqual(countErrors(output), 3);
});

test("returns 0 for clean output", () => {
	assert.strictEqual(countErrors("Compiling myapp v0.1.0\nFinished dev [unoptimized + debuginfo]"), 0);
});

test("ignores lines that contain 'error' but don't start with it", () => {
	const output = `
    --> src/main.rs:10:5
     |
help: a struct with a similar name exists: \`MyError\`
For more information about this error, try \`rustc --explain E0433\`
`;
	assert.strictEqual(countErrors(output), 0);
});

test("counts mixed error lines (case insensitive)", () => {
	const output = `
error[E0433]: failed to resolve
Error: ENOENT: no such file or directory
error: could not compile
`;
	assert.strictEqual(countErrors(output), 3);
});

// --- Plan Parsing ---

section("parseSteps");

test("parses clean/fix/organize steps", () => {
	const plan = `
# Janitor Plan

## Steps

### Clean
1. [clean] Remove greet command dead code
   Files: src-tauri/src/commands/mod.rs

2. [clean] Remove unused dependency
   Files: package.json

### Fix
3. [fix] Pin objc2 to 0.5 in Cargo.toml
   Files: Cargo.toml
   Impact: Resolves ~10 errors

4. [fix] Fix whisper-rs API change
   Files: src-tauri/src/transcription/mod.rs

### Organize
5. [organize] Extract utils module
   Files: src-tauri/src/db/utils.rs
`;
	const steps = parseSteps(plan);
	assert.strictEqual(steps.length, 5);
	assert.deepStrictEqual(steps[0], { number: 1, category: "clean", description: "Remove greet command dead code" });
	assert.deepStrictEqual(steps[2], { number: 3, category: "fix", description: "Pin objc2 to 0.5 in Cargo.toml" });
	assert.deepStrictEqual(steps[4], { number: 5, category: "organize", description: "Extract utils module" });
});

test("returns empty array for plan without steps", () => {
	assert.deepStrictEqual(parseSteps("# Janitor Plan\nNo steps here."), []);
});

test("ignores lines that don't match the format", () => {
	const plan = `
1. [clean] Valid step
- Not a step
2. [invalid] Wrong category
3. [fix] Another valid step
`;
	const steps = parseSteps(plan);
	assert.strictEqual(steps.length, 2);
	assert.strictEqual(steps[0].number, 1);
	assert.strictEqual(steps[1].number, 3);
});

test("handles non-sequential numbering", () => {
	const plan = `
1. [clean] First
5. [fix] Fifth
10. [organize] Tenth
`;
	const steps = parseSteps(plan);
	assert.strictEqual(steps.length, 3);
	assert.strictEqual(steps[0].number, 1);
	assert.strictEqual(steps[1].number, 5);
	assert.strictEqual(steps[2].number, 10);
});

// --- Step Verification ---

section("verifyStep");

test("clean: passes when errors stay same", () => {
	const result = verifyStep("clean", 22, 22, false);
	assert.strictEqual(result.passed, true);
});

test("clean: passes when errors decrease", () => {
	const result = verifyStep("clean", 22, 20, false);
	assert.strictEqual(result.passed, true);
	assert.strictEqual(result.newErrorCount, 20);
});

test("clean: fails when errors increase", () => {
	const result = verifyStep("clean", 22, 25, false);
	assert.strictEqual(result.passed, false);
	assert.ok(result.reason.includes("increased"));
});

test("fix: passes when errors decrease", () => {
	const result = verifyStep("fix", 22, 12, false);
	assert.strictEqual(result.passed, true);
	assert.strictEqual(result.newErrorCount, 12);
});

test("fix: passes when build passes with 0 errors", () => {
	const result = verifyStep("fix", 5, 0, true);
	assert.strictEqual(result.passed, true);
});

test("fix: fails when errors stay same", () => {
	const result = verifyStep("fix", 22, 22, false);
	assert.strictEqual(result.passed, false);
	assert.ok(result.reason.includes("did not decrease"));
});

test("fix: fails when errors increase", () => {
	const result = verifyStep("fix", 22, 25, false);
	assert.strictEqual(result.passed, false);
});

test("organize: passes when errors stay same", () => {
	const result = verifyStep("organize", 0, 0, true);
	assert.strictEqual(result.passed, true);
});

test("organize: fails when errors increase", () => {
	const result = verifyStep("organize", 0, 3, false);
	assert.strictEqual(result.passed, false);
	assert.ok(result.reason.includes("Revert"));
});

// --- Stack Detection ---

section("detectStack");

test("detects Cargo.toml → cargo build/test", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "Cargo.toml"), "[package]\nname = \"test\"");
	const stack = detectStack(dir);
	assert.deepStrictEqual(stack.buildCmds, ["cargo build"]);
	assert.deepStrictEqual(stack.testCmds, ["cargo test"]);
	cleanup(dir);
});

test("detects package.json with build script → npm run build", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
		scripts: { build: "tsc", test: "vitest" },
	}));
	const stack = detectStack(dir);
	assert.deepStrictEqual(stack.buildCmds, ["npm run build"]);
	assert.deepStrictEqual(stack.testCmds, ["npm run test"]);
	cleanup(dir);
});

test("detects pnpm-lock.yaml → uses pnpm runner", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
		scripts: { build: "vite build" },
	}));
	fs.writeFileSync(path.join(dir, "pnpm-lock.yaml"), "lockfileVersion: 5.4");
	const stack = detectStack(dir);
	assert.deepStrictEqual(stack.buildCmds, ["pnpm build"]);
	cleanup(dir);
});

test("detects mixed stack (Cargo + package.json)", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "Cargo.toml"), "[package]");
	fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
		scripts: { build: "vite build" },
	}));
	const stack = detectStack(dir);
	assert.strictEqual(stack.buildCmds.length, 2);
	assert.ok(stack.buildCmds.includes("cargo build"));
	cleanup(dir);
});

test("returns empty for unknown project", () => {
	const dir = makeTempDir();
	const stack = detectStack(dir);
	assert.strictEqual(stack.buildCmds.length, 0);
	assert.strictEqual(stack.testCmds.length, 0);
	cleanup(dir);
});

test("detects pyproject.toml", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "pyproject.toml"), "[project]\nname = \"test\"");
	const stack = detectStack(dir);
	assert.strictEqual(stack.buildCmds.length, 1);
	assert.ok(stack.buildCmds[0].includes("compileall"));
	cleanup(dir);
});

test("detects Cargo.toml in subdirectory (Tauri-style)", () => {
	const dir = makeTempDir();
	const subDir = path.join(dir, "src-tauri");
	fs.mkdirSync(subDir, { recursive: true });
	fs.writeFileSync(path.join(subDir, "Cargo.toml"), '[package]\nname = "myapp"');
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.some(c => c.includes("cargo build") && c.includes("src-tauri/Cargo.toml")),
		`Expected cargo build with manifest-path, got: ${stack.buildCmds}`);
	assert.ok(stack.testCmds.some(c => c.includes("cargo test") && c.includes("src-tauri/Cargo.toml")),
		`Expected cargo test with manifest-path, got: ${stack.testCmds}`);
	cleanup(dir);
});

test("detects Tauri project (Cargo in subdir + package.json in root)", () => {
	const dir = makeTempDir();
	const subDir = path.join(dir, "src-tauri");
	fs.mkdirSync(subDir, { recursive: true });
	fs.writeFileSync(path.join(subDir, "Cargo.toml"), '[package]\nname = "myapp"');
	fs.writeFileSync(path.join(dir, "package.json"), '{"scripts":{"build":"vite build"}}');
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.some(c => c.includes("cargo build")), "Should detect cargo");
	assert.ok(stack.buildCmds.some(c => c.includes("npm run build")), "Should detect npm");
	assert.strictEqual(stack.buildCmds.length, 2, `Expected 2 build cmds, got: ${stack.buildCmds}`);
	cleanup(dir);
});

test("detects Go project", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "go.mod"), "module example.com/myapp");
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.includes("go build ./..."));
	assert.ok(stack.testCmds.includes("go test ./..."));
	cleanup(dir);
});

test("detects Maven project", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "pom.xml"), "<project></project>");
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.includes("mvn compile -q"));
	cleanup(dir);
});

test("detects Gradle project", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "build.gradle"), "apply plugin: 'java'");
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.includes("./gradlew build -x test -q"));
	cleanup(dir);
});

test("detects Swift package", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "Package.swift"), "// swift-tools-version: 5.9");
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.includes("swift build"));
	assert.ok(stack.testCmds.includes("swift test"));
	cleanup(dir);
});

test("detects Makefile project", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "Makefile"), "all:\n\tgcc main.c");
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.includes("make"));
	cleanup(dir);
});

test("detects yarn project", () => {
	const dir = makeTempDir();
	fs.writeFileSync(path.join(dir, "package.json"), '{"scripts":{"build":"vite build"}}');
	fs.writeFileSync(path.join(dir, "yarn.lock"), "# yarn lockfile");
	const stack = detectStack(dir);
	assert.ok(stack.buildCmds.includes("yarn build"));
	cleanup(dir);
});

// --- Error Extraction ---

section("extractErrorLines");

test("extracts lines starting with error (universal pattern)", () => {
	const output = `
Compiling myapp v0.1.0
error[E0433]: failed to resolve: use of undeclared crate
  --> src/main.rs:1:5
error[E0412]: cannot find type
  --> src/macos.rs:10:15
warning: unused import
error: aborting due to 2 previous errors
`;
	const errors = extractErrorLines(output);
	assert.strictEqual(errors.length, 3);
	assert.ok(errors[0].includes("E0433"));
});

test("extracts Error: lines (case insensitive)", () => {
	const output = `Error: Cannot find module 'react'\nError: ENOENT`;
	const errors = extractErrorLines(output);
	assert.strictEqual(errors.length, 2);
});

test("uses summary fallback when no error prefix found", () => {
	const output = `src/main.py:5: syntax error\n2 errors found`;
	const errors = extractErrorLines(output);
	assert.strictEqual(errors.length, 2);
});

test("returns empty for clean output", () => {
	assert.strictEqual(extractErrorLines("Finished dev [unoptimized]").length, 0);
});

// --- Plan Coverage Validation ---

section("validatePlanCoverage");

test("rejects plan with no Impact lines", () => {
	const plan = `1. [fix] Fix something\n2. [clean] Remove something`;
	const result = validatePlanCoverage(plan, 22);
	assert.strictEqual(result.valid, false);
	assert.ok(result.reason?.includes("no Impact lines"));
});

test("rejects plan with insufficient coverage", () => {
	const plan = `
1. [fix] Fix one thing
   Impact: Resolves ~5 errors
2. [fix] Fix another
   Impact: Resolves ~3 errors
`;
	const result = validatePlanCoverage(plan, 22);
	assert.strictEqual(result.valid, false);
	assert.strictEqual(result.estimatedImpact, 8);
	assert.ok(result.reason?.includes("22"));
});

test("accepts plan with >= 70% coverage", () => {
	const plan = `
1. [fix] Fix root cause A
   Impact: Resolves ~10 errors
2. [fix] Fix root cause B
   Impact: Resolves ~8 errors
`;
	const result = validatePlanCoverage(plan, 22);
	assert.strictEqual(result.valid, true);
	assert.strictEqual(result.estimatedImpact, 18);
});

test("accepts plan with exact coverage", () => {
	const plan = `
1. [fix] Fix everything
   Impact: Resolves 22 errors
`;
	const result = validatePlanCoverage(plan, 22);
	assert.strictEqual(result.valid, true);
});

test("accepts any plan when baseline is 0 (organize-only)", () => {
	const plan = `1. [organize] Deduplicate utils`;
	const result = validatePlanCoverage(plan, 0);
	assert.strictEqual(result.valid, true);
});

test("handles Impact with tilde (~) prefix", () => {
	const plan = `
1. [fix] Fix A
   Impact: Resolves ~15 errors
2. [fix] Fix B
   Impact: Resolves 7 errors
`;
	const result = validatePlanCoverage(plan, 22);
	assert.strictEqual(result.valid, true);
	assert.strictEqual(result.estimatedImpact, 22);
});

test("handles Impact: Resolves 0 errors for clean steps", () => {
	const plan = `
1. [clean] Remove dead code
   Impact: Resolves 0 errors
2. [fix] Fix compilation
   Impact: Resolves ~22 errors
`;
	const result = validatePlanCoverage(plan, 22);
	assert.strictEqual(result.valid, true);
	assert.strictEqual(result.estimatedImpact, 22);
});

// --- Output Truncation ---

section("truncateOutput");

test("does not truncate short output", () => {
	const output = "line1\nline2\nline3";
	assert.strictEqual(truncateOutput(output), output);
});

test("truncates long output with ellipsis", () => {
	const lines = Array.from({ length: 200 }, (_, i) => `line ${i}`);
	const result = truncateOutput(lines.join("\n"));
	assert.ok(result.includes("omitted"));
	assert.ok(result.includes("line 0")); // first line preserved
	assert.ok(result.includes("line 199")); // last line preserved
});

// --- State File ---

section("state management");

test("writes and reads janitor-state.json", () => {
	const dir = makeTempDir();
	const piDir = path.join(dir, ".pi");
	fs.mkdirSync(piDir, { recursive: true });

	const state = {
		active: true,
		phase: "executing" as const,
		buildCmds: ["cargo build"],
		testCmds: ["cargo test"],
		baselineErrors: 22,
		lastErrorCount: 15,
		currentStep: 3,
		totalSteps: 8,
		retriesOnStep: 1,
		planningRetries: 0,
	};

	fs.writeFileSync(path.join(piDir, "janitor-state.json"), JSON.stringify(state, null, 2));
	const read = JSON.parse(fs.readFileSync(path.join(piDir, "janitor-state.json"), "utf-8"));

	assert.strictEqual(read.active, true);
	assert.strictEqual(read.phase, "executing");
	assert.strictEqual(read.currentStep, 3);
	assert.strictEqual(read.lastErrorCount, 15);

	cleanup(dir);
});

// --- Plan File ---

section("plan integration");

test("reads plan from .pi/janitor-plan.md and finds step by number", () => {
	const dir = makeTempDir();
	const piDir = path.join(dir, ".pi");
	fs.mkdirSync(piDir, { recursive: true });

	const plan = `# Janitor Plan

## Steps

### Clean
1. [clean] Remove dead code

### Fix
2. [fix] Fix compilation errors
3. [fix] Fix test failures

### Organize
4. [organize] Deduplicate utils
`;
	fs.writeFileSync(path.join(piDir, "janitor-plan.md"), plan);

	const content = fs.readFileSync(path.join(piDir, "janitor-plan.md"), "utf-8");
	const steps = parseSteps(content);
	assert.strictEqual(steps.length, 4);

	const step3 = steps.find((s) => s.number === 3);
	assert.ok(step3);
	assert.strictEqual(step3.category, "fix");
	assert.strictEqual(step3.description, "Fix test failures");

	cleanup(dir);
});

// ═══════════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════════

console.log(`\n═══ Results: ${passed}/${passed + failed} passed, ${failed} failed ═══\n`);
if (failed > 0) process.exit(1);
