---
name: discovery
description: "Deep interview with the operator to understand what they want to build. Produces brief.md — a short document (< 1 page) with 6 sections. Presents Gate 1."
---

# Discovery Skill

## ⚠️ LANGUAGE: Communicate with the operator in PORTUGUESE. Write brief.md in ENGLISH.

## What this skill does

ONE thing: understand what the operator wants to build and produce a brief.

- **Input:** operator's natural language description
- **Output:** `.pi/specs/<feature>/brief.md` — short document (< 1 page) with 6 sections

## How deep to go

There is **NO round limit**. Go as deep as necessary. The ONLY exit condition is:

> You can write the brief with ZERO assumptions about user behavior.

If you pause on any section and think "here I'll have to assume something" → you're not done. Ask the question that eliminates the assumption.

**Discovery ends when: every behavioral decision was made by the operator, not by you.**

The depth is in the process, not in the document. A journalist interviews for 2 hours and writes a 500-word article.

## Process

### Step 0: Initialize

Update `workflow-state.json`: set `currentPhase: "discovery"`. This ensures the state accurately reflects that discovery is in progress (important for session restarts).

Choose a **feature ID** — a short kebab-case identifier derived from the product name. Examples:
- "Shopping List App" → `shopping-list`
- "Commercial Proposal Generator" → `proposal-generator`
- "Personal CRM" → `personal-crm`

This ID is used everywhere: `.pi/specs/<id>/`, `feature/<id>` branch, `workflow-state.json` feature field. Pick it early so all artifacts use the same ID.

### Step 1: Listen

The operator describes what they want. Don't interrupt. Absorb the full picture.

### Step 2: Research (if applicable)

If the operator mentions references, competitors, or inspiration:
1. Use `web_search` and `fetch_content` to study them in depth
2. Understand what works well and what doesn't apply
3. Share findings with the operator BEFORE asking questions

If the operator describes a domain you don't fully understand:
1. Research existing solutions in that space
2. Understand common patterns and user expectations

### Step 3: Ask — mandatory questions (ALWAYS, no exceptions)

These 5 questions must be answered before moving forward. Ask them naturally in conversation — not as a numbered list dumped all at once. Adapt based on what the operator already told you.

1. **Problem:** What problem does this solve? Why does this need to exist?
2. **Who uses it:** Who will use this? In what context? (desktop, phone, on the go, at work...)
3. **Capabilities:** What will the person be able to do? (concrete actions, not features)
4. **Negative scope:** What should NOT be in this version?
5. **Success:** How do you know it worked? When do you look at it and say "that's it"?

### Step 4: Ask — conditional questions (only if the product involves)

- **User data** → How is data accessed? Persistence? Login needed?
- **Multiple users** → How do they interact? Permissions? What can each see?
- **Integrations** → External services? APIs? Third-party data?
- **Money** → Payment flow? Who pays whom? When?
- **User content** → Creation? Moderation? Who sees what?

### Step 5: Verify completeness

Before writing the brief, mentally walk through each section of the template. If ANY section requires you to assume something the operator didn't explicitly decide → ask that question.

### Step 6: Write brief.md

Save to `.pi/specs/<feature>/brief.md` using the template below. Keep it SHORT — under 1 page.

### Step 7: Present Gate 1

Show the brief to the operator in Portuguese. Then use the `ask` tool:

```
questions: [{
  id: "gate1",
  question: "Entendi direito o que você quer construir?",
  options: [
    { label: "É isso! Pode seguir" },
    { label: "Quase, mas quero corrigir algo" },
    { label: "Não é isso, vamos repensar" }
  ],
  recommended: 0
}]
```

### Gate 1 feedback paths

- **"É isso! Pode seguir"** → Update `workflow-state.json`: set `gates.briefApproved: true`, `currentPhase: "specify"`. Proceed to `specify` skill.
- **"Quase, mas quero corrigir algo"** → Ask what to correct. Update the brief with the feedback. Present Gate 1 again. Do NOT restart discovery from scratch.
- **"Não é isso, vamos repensar"** → Restart discovery from Step 1. This is rare — means fundamental misunderstanding.

## brief.md Template

```markdown
# Brief: [product name]

## Problem
[What problem does this solve? Why does it exist? 2-3 sentences.]

## Who uses it
[Who will use this and in what context.]

## What the person will be able to do
- [Capability 1 — in action language, not technical features]
- [Capability 2]
- [...]

## What's out of scope
- [Explicitly: what is NOT in this version]

## References researched
- [Product/site researched — what was useful and what doesn't apply]
- (if none: "No external references needed")

## Operator decisions
- [Decision 1 — e.g., "Single list, not by category"]
- [Decision 2 — e.g., "Purchased item stays crossed out, doesn't disappear"]
- [...]
```

The "Operator decisions" section is NOT a transcript. It's a list of **product decisions** made during discovery — short, direct, traceable.

## Rules

- NEVER ask about technology. You decide that later. Discovery is about WHAT, not HOW.
- Ask questions one at a time or in small natural groups — not a wall of 10 questions.
- If the operator gives short answers, probe deeper. "Lista de compras" is not enough — you need to know if it's shared, if items have categories, if there's a history, etc.
- If the operator says "you decide" for a behavioral question, push back gently: "Preciso que você decida isso porque muda o que o produto faz." Only if they insist, make the decision and record it in "Operator decisions" as "Operator deferred: agent decided [X] because [reason]."
- The brief must be readable by someone who wasn't in the conversation and still understand exactly what's being built.
- Do NOT use the `interview` tool. Use natural conversation + `ask` tool for Gate 1 only.
