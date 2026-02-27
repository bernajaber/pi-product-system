---
name: specify
description: "Transform an approved brief into structured acceptance scenarios. Produces spec.md — an internal document the operator does not see."
---

# Specify Skill

## ⚠️ LANGUAGE: Write spec.md in ENGLISH. This is an internal document — the operator never sees it.

## What this skill does

ONE thing: transform the brief into precise, testable acceptance scenarios.

- **Input:** `.pi/specs/<feature>/brief.md` (approved at Gate 1)
- **Output:** `.pi/specs/<feature>/spec.md` — structured acceptance scenarios

## What this skill does NOT do

- Does NOT interview the operator. That was `discovery`'s job.
- Does NOT research references. That was `discovery`'s job.
- Does NOT present anything to the operator. spec.md is internal.
- Does NOT make assumptions. If the brief requires an assumption, discovery failed — go back.

## Process

### Step 1: Read the brief

Read `.pi/specs/<feature>/brief.md`. Every section matters:
- **Problem** → understand the "why"
- **Who uses it** → understand the context of use
- **Capabilities** → these become your acceptance scenarios
- **Out of scope** → these become your constraints
- **References** → inform design decisions
- **Operator decisions** → these are BINDING. Do not override them.

### Step 2: Read constitutions

Read `~/.pi/agent/product-constitution.md` for product principles that affect scenarios (e.g., "zero visible bugs" means you MUST include error/edge case scenarios).

### Step 3: Write acceptance scenarios

For each capability in the brief, write 1-3 acceptance scenarios. Each scenario:
- Describes a USER BEHAVIOR, not a technical implementation
- Is independently testable
- Has a clear pass/fail condition

Also include:
- At least one **empty state** scenario (first use, no data)
- At least one **error/edge case** scenario per capability
- At least one **boundary** scenario if applicable (long text, many items, etc.)

### Step 4: Save spec.md

Save to `.pi/specs/<feature>/spec.md` using the template below.

### Step 5: Update state

Update `workflow-state.json`: set `currentPhase: "plan"`.
Populate `.pi/feature-list.json` with each acceptance scenario:

```json
[
  { "name": "User can add an item to the list", "passes": false },
  { "name": "Empty state shows helpful message", "passes": false },
  { "name": "When item text is empty, shows error", "passes": false }
]
```

Each entry maps to an acceptance scenario from the spec. The `passes` field starts as `false` and is set to `true` by the `publish` skill when the feature is released.

## spec.md Template

```markdown
# Spec: [feature name]

## Description
[What the feature does — 2-3 sentences in plain language]

## Design Reference
[If references were researched in the brief: key patterns, what applies, what doesn't]
[If no references: "No design references — original implementation"]

## Acceptance Scenarios
- [ ] [Scenario 1: "User can [action] and sees [result]"]
- [ ] [Scenario 2: "When [condition], [expected behavior]"]
- [ ] [Empty state: "On first use with no data, user sees [what]"]
- [ ] [Error case: "When [error condition], user sees [feedback]"]
- [ ] [Edge case: "When [boundary condition], [expected behavior]"]
(aim for 5-10 scenarios covering happy path, edge cases, and error states)

## Constraints
[What is NOT in scope — from the brief's "out of scope" section]

## Dependencies
[Features or infrastructure required before this one]
[If none: "No dependencies — standalone feature"]
```

## Quality rules

- Scenarios MUST be in product language: "User can X" not "Component renders Y"
- Each scenario must be independently testable by the `test` skill
- There must be NO "Assumed Decisions" section. If you need to assume something, the brief is incomplete — flag it and go back to discovery.
- If the brief's capabilities are vague (e.g., "manage items"), expand into specific scenarios (add, edit, delete, reorder, etc.) based on the operator decisions in the brief.
- If scope is large (more than 5 features): split into smaller features and create separate specs.

## Rules

- Do NOT ask the operator anything. You have the brief — it should have everything.
- If the brief is missing critical information, do NOT guess. Update `workflow-state.json` to go back to `discovery` phase and explain what's missing.
- spec.md is an INTERNAL document. The operator sees brief.md (Gate 1) and the plan summary (Gate 2). They never see spec.md directly.
- Do NOT use the `interview` tool or the `ask` tool. This skill has no operator interaction.
