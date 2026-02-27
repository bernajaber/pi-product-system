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
 * Review phase: the extension sends the review rubric + project REVIEW_GUIDELINES.md
 * as follow-up context. Adapted from mitsupi's /review concept for autonomous operation.
 * Max 3 review cycles enforced by the extension. Review summary goes in the PR at publish.
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

// Phases where the agent needs a one-time nudge to follow the workflow
const GUIDED_PHASES = ["idle", "init"];

const MAX_REVIEW_CYCLES = 3;

type Progress = {
	task: number;
	of: number;
	status: "ok" | "stuck";
};

type WorkflowState = {
	currentPhase: string;
	progress?: Progress;
	codeLoop?: {
		lastFailedScenario?: string | null;
		lastDiagnosis?: string | null;
		lastReentryTask?: string | null;
	};
	[key: string]: unknown;
};

type LoopStateData = {
	active: boolean;
	phase: string | null;
	stuckCount: number;
	turnCount: number;
	reviewCycles: number;
	guidedNudgeSent: boolean;
};

const LOOP_STATE_ENTRY = "product-loop-state";

const EMPTY_STATE: LoopStateData = {
	active: false,
	phase: null,
	stuckCount: 0,
	turnCount: 0,
	reviewCycles: 0,
	guidedNudgeSent: false,
};

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

function phaseFollowUp(ws: WorkflowState, progress: Progress | undefined, loopState: LoopStateData, cwd: string): string | null {
	const phase = ws.currentPhase;
	if (phase === "build") return buildPhaseFollowUp(progress, loopState, ws);
	if (phase === "test") return testPhaseFollowUp(progress, loopState);
	if (phase === "review") return reviewPhaseFollowUp(progress, loopState, cwd);
	return null;
}

function buildPhaseFollowUp(progress: Progress | undefined, loopState: LoopStateData, ws: WorkflowState): string {
	// Surgical fix mode: code quality loop sent us back to build for a specific fix
	const codeLoop = ws.codeLoop as { lastFailedScenario?: string; lastDiagnosis?: string; lastReentryTask?: string } | undefined;
	if (codeLoop?.lastFailedScenario) {
		const scenario = codeLoop.lastFailedScenario;
		const diagnosis = codeLoop.lastDiagnosis || "See scout diagnosis above.";
		const task = codeLoop.lastReentryTask;
		return [
			"⚠️ SURGICAL FIX MODE — code quality loop.",
			`Failed scenario: "${scenario}"`,
			task ? `Mapped to plan task: ${task}` : "No specific task mapped — investigate the root cause.",
			`Diagnosis: ${diagnosis}`,
			"",
			"Fix ONLY the specific issue. Commit the fix. Then update progress to mark this task done.",
			"The loop will run test → review → validate again after the fix.",
		].join("\n");
	}

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

function testPhaseFollowUp(progress: Progress | undefined, loopState: LoopStateData): string {
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

function reviewPhaseFollowUp(progress: Progress | undefined, loopState: LoopStateData, cwd: string): string {
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

	// Max cycles reached — force proceed (> not >= because increment happens before check)
	if (loopState.reviewCycles > MAX_REVIEW_CYCLES) {
		return [
			`Review has run ${MAX_REVIEW_CYCLES} cycles. Proceeding to validate — it will catch remaining issues through browser testing.`,
			"Update progress: { task: 1, of: 1, status: \"ok\" } to mark review as complete.",
			'Then update currentPhase to "validate" in .pi/workflow-state.json.',
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

	// Drive — run the review. Send rubric + project guidelines.
	const parts: string[] = [];

	parts.push(`Review cycle ${loopState.reviewCycles} of ${MAX_REVIEW_CYCLES}. Review all code changes on this branch. Run \`git diff main\` (or the base branch) to see the full diff.`);

	// Append project-specific guidelines (single source of truth for per-project rules)
	const guidelines = readReviewGuidelines(cwd);
	if (guidelines) {
		parts.push("");
		parts.push(guidelines);
	}

	parts.push("");
	parts.push("Also check against the Product Constitution: ~/.pi/agent/product-constitution.md");
	parts.push("");
	parts.push("After reviewing:");
	parts.push('- If P0 or P1 found: fix them, commit with message "fix: [what] (review P0/P1)", then update progress status to "ok" (the review will run again).');
	parts.push("- If only P2/P3 or clean: update progress task to 1 (marks review as complete).");

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
			? `🔍 Review: fixing issues ⚠️ (cycle ${loopState.reviewCycles}/${MAX_REVIEW_CYCLES})`
			: `🔍 Review: cycle ${loopState.reviewCycles}/${MAX_REVIEW_CYCLES}`;
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
	let loopState: LoopStateData = { ...EMPTY_STATE };

	function persistState(): void {
		pi.appendEntry(LOOP_STATE_ENTRY, loopState);
	}

	function loadState(ctx: ExtensionContext): LoopStateData {
		const entries = ctx.sessionManager.getEntries();
		for (let i = entries.length - 1; i >= 0; i--) {
			const entry = entries[i] as { type: string; customType?: string; data?: LoopStateData };
			if (entry.type === "custom" && entry.customType === LOOP_STATE_ENTRY && entry.data) {
				return { ...EMPTY_STATE, ...entry.data };
			}
		}
		return { ...EMPTY_STATE };
	}

	function sendFollowUp(content: string, triggerTurn: boolean = true): void {
		pi.sendMessage(
			{ customType: "product-loop", content, display: true },
			{ deliverAs: "followUp", triggerTurn }
		);
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
				loopState = { ...EMPTY_STATE };
				persistState();
				updateWidget(ctx, ws, loopState);
				ctx.ui.notify("Loop parado", "info");
				return;
			}
		}

		// Not an autonomous phase? Clear loop and return.
		if (!AUTONOMOUS_PHASES.includes(ws.currentPhase)) {
			if (loopState.active) {
				loopState = { ...EMPTY_STATE };
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
				turnCount: 0,
				reviewCycles: 0,
			};
		}

		// Track stuck count
		const progress = ws.progress;
		if (progress?.status === "stuck") {
			loopState.stuckCount++;
		} else {
			loopState.stuckCount = 0;
		}

		// Track review cycles: each time the review follow-up is about to send
		// the rubric (progress exists, task < of, status ok, not stuck), that's a new cycle.
		if (ws.currentPhase === "review" && progress && progress.task < progress.of && progress.status === "ok") {
			loopState.reviewCycles++;
		}

		loopState.active = true;
		loopState.turnCount++;

		persistState();
		updateWidget(ctx, ws, loopState);

		// Build and send follow-up
		const followUp = phaseFollowUp(ws, progress, loopState, ctx.cwd);
		if (!followUp) return;

		sendFollowUp(followUp);
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
			loopState.phase === "review" ? `Review cycles: ${loopState.reviewCycles}/${MAX_REVIEW_CYCLES}.` : "",
			"After compaction, continue from where you left off. Read .pi/workflow-state.json for current state.",
			"Update progress in workflow-state.json after each task.",
		].filter(Boolean).join("\n");

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

	// --- Session start: restore state and resume if needed ---
	pi.on("session_start", async (_event, ctx) => {
		loopState = loadState(ctx);

		const ws = readWorkflowState(ctx.cwd);
		if (ws && AUTONOMOUS_PHASES.includes(ws.currentPhase)) {
			loopState.active = true;
			loopState.phase = ws.currentPhase;
			updateWidget(ctx, ws, loopState);

			// Resume: send a follow-up so the agent doesn't sit idle after restart
			const followUp = phaseFollowUp(ws, ws.progress, loopState, ctx.cwd);
			if (followUp) {
				sendFollowUp(followUp);
			}
		} else if (ws && GUIDED_PHASES.includes(ws.currentPhase) && !loopState.guidedNudgeSent) {
			// Guided phases (idle/init): send nudge on session_start with triggerTurn=false
			// so it becomes context for the agent ALONGSIDE the user's first message.
			// Using triggerTurn=true would consume the nudge in a separate turn before
			// the user's message arrives, causing the agent to miss the user's request.
			loopState.guidedNudgeSent = true;
			persistState();
			sendFollowUp(
				"⚠️ SYSTEM: This project uses the Product Creation System.\n" +
				"You MUST follow the workflow in .pi/AGENTS.md — read it now.\n" +
				"Do NOT write any code until Gates 1 and 2 are approved.\n\n" +
				"Read ~/.pi/agent/skills/discovery/SKILL.md and begin the discovery process.\n" +
				"The operator's NEXT message describes what they want to build — use it as discovery input.",
				false // triggerTurn=false: becomes context, doesn't steal a turn
			);
		} else if (loopState.active) {
			loopState = { ...EMPTY_STATE };
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
