/**
 * Product Loop — Workflow Governor
 *
 * Keeps the agent working during autonomous phases (build, test, review)
 * by sending contextual follow-up messages after each turn.
 *
 * Reads workflow-state.json to decide what to do. The agent reports
 * its own progress via the `progress` field:
 *
 *   { "task": 4, "of": 8, "status": "ok" | "stuck" }
 *
 * Three gears:
 *   Drive    — agent progressing → "Continue with next task"
 *   Diagnose — agent reports stuck → "Analyze what's wrong, try different approach"
 *   Escalate — stuck 2+ turns → "Escalate to operator via ask tool"
 *
 * Review phase uses the diff-based review concept from mitsupi's /review,
 * adapted for autonomous operation: no session branching, no operator commands.
 * The rubric + REVIEW_GUIDELINES.md are sent as follow-up context.
 * Review summary goes into the PR at publish time.
 *
 * The loop ends naturally when currentPhase changes to a non-autonomous phase.
 * No signal_loop_success needed. No slash commands. No tools.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { compact } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// Phases where the extension sends follow-ups automatically
const AUTONOMOUS_PHASES = ["build", "test", "review"];

type Progress = {
	task: number;
	of: number;
	status: "ok" | "stuck";
};

type WorkflowState = {
	currentPhase: string;
	feature: string | null;
	progress?: Progress;
	failureCount: number;
	[key: string]: unknown;
};

type LoopStateData = {
	active: boolean;
	phase: string | null;
	stuckCount: number;
	lastTask: number;
	turnCount: number;
};

const LOOP_STATE_ENTRY = "product-loop-state";

// ---------------------------------------------------------------------------
// Review rubric (adapted from mitsupi's /review, Codex-inspired)
// ---------------------------------------------------------------------------

const REVIEW_RUBRIC = `## What to flag

Flag issues that:
1. Meaningfully impact accuracy, performance, security, or maintainability.
2. Are discrete and actionable (not general or combined issues).
3. Were introduced in the changes being reviewed (not pre-existing).
4. The author would fix if aware of them.
5. Have provable impact (not speculation).

## Priority levels

- [P0] — Blocks release. Breaks something tests didn't catch.
- [P1] — Urgent. Violates Product Constitution principles.
- [P2] — Normal. Code quality issues.
- [P3] — Low. Nice to have.

## Security checks

- Flag SQL that is not parameterized.
- Flag unvalidated user input rendered as HTML (XSS).
- Flag exposed secrets or credentials.
- Flag open redirects without domain validation.

## Comment guidelines

- Be clear about WHY the issue is a problem.
- Be brief — at most 1 paragraph per finding.
- Use a matter-of-fact tone.
- Explicitly state scenarios where the issue arises.

## Output format

1. List each finding: priority tag, file:line, explanation.
2. End with verdict: "correct" (no P0/P1) or "needs attention" (has P0/P1).
3. If no qualifying findings, state the code looks good.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readWorkflowState(cwd: string): WorkflowState | null {
	const wsPath = path.join(cwd, ".pi", "workflow-state.json");
	try {
		return JSON.parse(fs.readFileSync(wsPath, "utf-8"));
	} catch {
		return null;
	}
}

function readReviewGuidelines(cwd: string): string | null {
	const guidelinesPath = path.join(cwd, "REVIEW_GUIDELINES.md");
	try {
		const content = fs.readFileSync(guidelinesPath, "utf-8").trim();
		return content || null;
	} catch {
		return null;
	}
}

function wasLastAssistantAborted(messages: Array<{ role?: string; stopReason?: string }>): boolean {
	for (let i = messages.length - 1; i >= 0; i--) {
		if (messages[i]?.role === "assistant") {
			return messages[i]?.stopReason === "aborted";
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// Follow-up messages per phase and gear
// ---------------------------------------------------------------------------

function buildFollowUp(ws: WorkflowState, loopState: LoopStateData, cwd: string): string | null {
	const phase = ws.currentPhase;
	const progress = ws.progress;

	if (!AUTONOMOUS_PHASES.includes(phase)) return null;

	if (phase === "build") {
		return buildPhaseFollowUp(ws, progress, loopState);
	}

	if (phase === "test") {
		return testPhaseFollowUp(ws, progress, loopState);
	}

	if (phase === "review") {
		return reviewPhaseFollowUp(ws, progress, loopState, cwd);
	}

	return null;
}

function buildPhaseFollowUp(
	_ws: WorkflowState,
	progress: Progress | undefined,
	loopState: LoopStateData
): string {
	if (!progress) {
		return [
			"You are in the build phase. Read ~/.pi/agent/skills/build/SKILL.md and .pi/specs/*/plan.md.",
			"Implement tasks one at a time. One task = one commit.",
			'After each task, update .pi/workflow-state.json progress: { task: N, of: TOTAL, status: "ok" }',
			"Skip the last task (Write Tests) — that's for the test skill.",
		].join("\n");
	}

	if (progress.task >= progress.of) {
		return [
			`All ${progress.of} build tasks complete.`,
			'Update currentPhase to "test" in .pi/workflow-state.json and reset progress to { task: 0, of: 1, status: "ok" }.',
			"Then follow the test skill: ~/.pi/agent/skills/test/SKILL.md",
		].join("\n");
	}

	if (progress.status === "stuck") {
		if (loopState.stuckCount >= 2) {
			return [
				`You've been stuck for ${loopState.stuckCount} turns on Task ${progress.task + 1} of ${progress.of}.`,
				"Escalate to the operator using the ask tool.",
				"Describe the problem in PRODUCT LANGUAGE (what the user won't be able to do), never technical details.",
				"Offer 3 options: deliver without this feature, try different approach, go back to planning.",
			].join("\n");
		}

		return [
			`You reported stuck on Task ${progress.task + 1} of ${progress.of}. Before continuing:`,
			"1. What have you tried so far?",
			"2. What is the specific error or impediment?",
			"3. Is there a simpler alternative approach?",
			"",
			"Try a different approach. If you can't figure it out, launch the scout agent to diagnose.",
			'When you make progress, update status to "ok" in workflow-state.json.',
		].join("\n");
	}

	const nextTask = progress.task + 1;
	return [
		`Task ${progress.task} of ${progress.of} done. Implement Task ${nextTask} from the plan.`,
		"One task = one commit. Update progress in .pi/workflow-state.json when done.",
	].join("\n");
}

function testPhaseFollowUp(
	_ws: WorkflowState,
	progress: Progress | undefined,
	loopState: LoopStateData
): string {
	if (!progress) {
		return [
			"You are in the test phase. Read ~/.pi/agent/skills/test/SKILL.md.",
			"Write tests for all acceptance scenarios, then run them.",
			'Update progress in .pi/workflow-state.json: { task: 0, of: 1, status: "ok" }',
		].join("\n");
	}

	if (progress.status === "stuck") {
		if (loopState.stuckCount >= 2) {
			return [
				`Tests keep failing after ${loopState.stuckCount} attempts.`,
				"Escalate to the operator using the ask tool.",
				"Describe what's not working in product language.",
			].join("\n");
		}

		return [
			"Tests are failing. Read the error output carefully.",
			"Fix the issue (it might be in the code, not the test), then run tests again.",
			'When tests pass, update status to "ok" and set progress task to 1.',
		].join("\n");
	}

	if (progress.task >= progress.of) {
		return [
			"Tests are passing.",
			'Update currentPhase to "review" in .pi/workflow-state.json and reset progress to { task: 0, of: 1, status: "ok" }.',
			"Then follow the review skill: ~/.pi/agent/skills/review/SKILL.md",
		].join("\n");
	}

	return [
		"Write and run tests: node tests/<feature>.test.js",
		"If they pass, update progress task to 1. If they fail, fix and retry.",
		'Update status to "stuck" if you can\'t get them to pass.',
	].join("\n");
}

function reviewPhaseFollowUp(
	_ws: WorkflowState,
	progress: Progress | undefined,
	loopState: LoopStateData,
	cwd: string
): string {
	if (!progress) {
		return [
			"You are in the review phase. Read ~/.pi/agent/skills/review/SKILL.md.",
			'Update progress in .pi/workflow-state.json: { task: 0, of: 1, status: "ok" }',
		].join("\n");
	}

	// Review complete — all clean
	if (progress.task >= progress.of) {
		return [
			"Review is clean — no P0/P1 issues.",
			'Update currentPhase to "validate" in .pi/workflow-state.json.',
			"Then follow the validate skill: ~/.pi/agent/skills/validate/SKILL.md",
		].join("\n");
	}

	if (progress.status === "stuck") {
		if (loopState.stuckCount >= 2) {
			return [
				`Review issues persist after ${loopState.stuckCount} fix attempts.`,
				"Escalate to the operator using the ask tool.",
				"Describe what quality issue you can't resolve, in product language.",
			].join("\n");
		}

		return [
			"You found P0/P1 issues but are having trouble fixing them.",
			"Re-read the findings. Is the fix simpler than you think?",
			"Try a minimal fix — don't refactor, just fix the specific issue.",
			'When fixed, commit, update status to "ok", and the review will re-run.',
		].join("\n");
	}

	// Drive — run the review
	// Build the review prompt with rubric + project guidelines
	const parts: string[] = [];

	parts.push("Review all code changes on this branch. Run `git diff main` (or the base branch) to see the full diff.");
	parts.push("");
	parts.push(REVIEW_RUBRIC);

	// Append project-specific guidelines
	const guidelines = readReviewGuidelines(cwd);
	if (guidelines) {
		parts.push("");
		parts.push("## Project-specific review guidelines");
		parts.push("");
		parts.push(guidelines);
	}

	parts.push("");
	parts.push("Also check against the Product Constitution: ~/.pi/agent/product-constitution.md");
	parts.push("");
	parts.push("After reviewing:");
	parts.push('- If P0 or P1 found: fix them, commit with message "fix: [what] (review P0/P1)", then update progress status to "ok" (the review will run again).');
	parts.push('- If only P2/P3 or clean: update progress task to 1 (marks review as complete).');
	parts.push("- Max 3 review cycles. After that, proceed anyway — validate will catch remaining issues.");

	return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

function updateWidget(ctx: ExtensionContext, ws: WorkflowState | null, loopState: LoopStateData): void {
	if (!ctx.hasUI) return;

	if (!loopState.active || !ws) {
		ctx.ui.setWidget("product-loop", undefined);
		return;
	}

	const progress = ws.progress;
	const phase = ws.currentPhase;
	let text = "";

	if (phase === "build" && progress) {
		const icon = progress.status === "stuck" ? "⚠️" : "✓";
		text = `🔨 Build: ${progress.task}/${progress.of} ${icon} (turn ${loopState.turnCount})`;
	} else if (phase === "test") {
		text = progress?.status === "stuck"
			? `🧪 Test: failing ⚠️ (turn ${loopState.turnCount})`
			: `🧪 Test: running (turn ${loopState.turnCount})`;
	} else if (phase === "review") {
		text = progress?.status === "stuck"
			? `🔍 Review: fixing issues ⚠️ (turn ${loopState.turnCount})`
			: `🔍 Review: cycle ${loopState.turnCount}`;
	}

	if (text) {
		ctx.ui.setWidget("product-loop", (_tui, theme) => {
			const { Text } = require("@mariozechner/pi-tui");
			return new Text(theme.fg("accent", text), 0, 0);
		});
	}
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function productLoop(pi: ExtensionAPI): void {
	let loopState: LoopStateData = {
		active: false,
		phase: null,
		stuckCount: 0,
		lastTask: 0,
		turnCount: 0,
	};

	function persistState(): void {
		pi.appendEntry(LOOP_STATE_ENTRY, loopState);
	}

	function loadState(ctx: ExtensionContext): LoopStateData {
		const entries = ctx.sessionManager.getEntries();
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i] as { type: string; customType?: string; data?: LoopStateData };
			if (entry.type === "custom" && entry.customType === LOOP_STATE_ENTRY && entry.data) {
				return entry.data;
			}
		}
		return { active: false, phase: null, stuckCount: 0, lastTask: 0, turnCount: 0 };
	}

	// --- agent_end: core loop logic ---
	pi.on("agent_end", async (event, ctx) => {
		const ws = readWorkflowState(ctx.cwd);
		if (!ws) return;

		// Operator typed something? Let their message take priority.
		if (ctx.hasPendingMessages()) return;

		// Agent was aborted (escape)? Ask if they want to stop.
		if (ctx.hasUI && wasLastAssistantAborted(event.messages as any)) {
			const confirm = await ctx.ui.confirm(
				"Parar o loop?",
				"Operação interrompida. Quer parar o loop de trabalho?"
			);
			if (confirm) {
				loopState = { active: false, phase: null, stuckCount: 0, lastTask: 0, turnCount: 0 };
				persistState();
				updateWidget(ctx, ws, loopState);
				ctx.ui.notify("Loop parado", "info");
				return;
			}
		}

		// Not an autonomous phase? Clear loop and return.
		if (!AUTONOMOUS_PHASES.includes(ws.currentPhase)) {
			if (loopState.active) {
				loopState = { active: false, phase: null, stuckCount: 0, lastTask: 0, turnCount: 0 };
				persistState();
				updateWidget(ctx, ws, loopState);
			}
			return;
		}

		// Phase changed? Reset counters.
		if (ws.currentPhase !== loopState.phase) {
			loopState = {
				active: true,
				phase: ws.currentPhase,
				stuckCount: 0,
				lastTask: ws.progress?.task ?? 0,
				turnCount: 0,
			};
		}

		// Track stuck count
		const progress = ws.progress;
		if (progress?.status === "stuck") {
			loopState.stuckCount++;
		} else {
			loopState.stuckCount = 0;
		}

		if (progress) {
			loopState.lastTask = progress.task;
		}

		loopState.active = true;
		loopState.turnCount++;

		persistState();
		updateWidget(ctx, ws, loopState);

		// Build and send follow-up
		const followUp = buildFollowUp(ws, loopState, ctx.cwd);
		if (!followUp) return;

		pi.sendMessage(
			{
				customType: "product-loop",
				content: followUp,
				display: true,
			},
			{
				deliverAs: "followUp",
				triggerTurn: true,
			}
		);
	});

	// --- Compaction: preserve loop context ---
	pi.on("session_before_compact", async (event, ctx) => {
		if (!loopState.active || !loopState.phase) return;
		if (!ctx.model) return;

		const apiKey = await ctx.modelRegistry.getApiKey(ctx.model);
		if (!apiKey) return;

		const ws = readWorkflowState(ctx.cwd);
		const progressText = ws?.progress
			? `Task ${ws.progress.task} of ${ws.progress.of}, status: ${ws.progress.status}`
			: "starting";

		const loopInstructions = [
			`Product workflow loop active. Phase: ${loopState.phase}. Progress: ${progressText}.`,
			`Turn count: ${loopState.turnCount}. Stuck count: ${loopState.stuckCount}.`,
			"After compaction, continue from where you left off. Read .pi/workflow-state.json for current state.",
			"Update progress in workflow-state.json after each task.",
		].join("\n");

		const combinedInstructions = [event.customInstructions, loopInstructions]
			.filter(Boolean)
			.join("\n\n");

		try {
			const compaction = await compact(
				event.preparation,
				ctx.model,
				apiKey,
				combinedInstructions,
				event.signal
			);
			return { compaction };
		} catch (error) {
			if (ctx.hasUI) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Product loop compaction failed: ${message}`, "warning");
			}
		}
	});

	// --- Session start: restore state ---
	pi.on("session_start", async (_event, ctx) => {
		loopState = loadState(ctx);

		const ws = readWorkflowState(ctx.cwd);
		if (ws && AUTONOMOUS_PHASES.includes(ws.currentPhase)) {
			loopState.active = true;
			loopState.phase = ws.currentPhase;
			updateWidget(ctx, ws, loopState);
		} else if (loopState.active) {
			loopState = { active: false, phase: null, stuckCount: 0, lastTask: 0, turnCount: 0 };
			persistState();
		}
	});

	// --- Session switch: restore state ---
	pi.on("session_switch", async (_event, ctx) => {
		loopState = loadState(ctx);
		const ws = readWorkflowState(ctx.cwd);
		updateWidget(ctx, ws, loopState);
	});
}
