---
name: product-specify
description: "Transform operator's natural language description into a structured spec with acceptance scenarios, assumed decisions, and reviewDepth."
---

# Product Specify Skill

## ⚠️ LANGUAGE: Write the spec in ENGLISH. The operator communicates in Portuguese, but ALL artifacts (spec.md, feature-list.json) must be in English.

## Process

### Step 1: Research (MANDATORY before writing anything)
If the operator mentions a design reference, competitor, or inspiration:
1. Fetch the referenced site/product and study it in depth
2. Take screenshots of key pages (home, detail, about, etc.)
3. Identify design patterns, layout choices, navigation structure
4. Note what works well and what doesn't apply to this project

If the operator's description implies a domain you don't fully understand:
1. Research existing solutions in that space
2. Understand common patterns and user expectations

Show the operator what you found and confirm direction BEFORE moving to Step 2.

### Step 2: Clarify (MANDATORY — always ask before writing the spec)
The operator gave you a high-level description. You MUST ask questions before deciding anything. Follow the `product-clarify` skill (read `~/.pi/agent/skills/product-clarify/SKILL.md`).

Rules:
- Ask 3-5 questions about PRODUCT BEHAVIOR in Portuguese
- Never ask about technology — you decide that
- Questions must be things where the operator's answer changes what gets built
- Wait for the operator to respond before proceeding
- If the operator's answers reveal more ambiguities, ask ONE more round (max 2 rounds total)

Only skip this step if the operator already gave extremely detailed requirements that leave no behavioral ambiguity. This is rare.

### Step 3: Specify
After research is done AND clarification questions are answered:
1. Read the operator's description, research findings, and clarification answers
2. Identify: core features, expected behaviors, implicit constraints
3. Generate the spec using the template below
4. Classify reviewDepth:
   - **simple**: static pages, basic forms, visual components, local-only CRUD
   - **medium**: CRUD with backend, API integrations, moderate business logic
   - **complex**: real-time, payments, authentication, multi-user, critical data
   - Modifiers: touches user data (+1 level), touches money (→ complex), external API (+1 level)
5. Populate `.pi/feature-list.json` with each identified feature (`passes: false`)
6. Save to `.pi/specs/<feature-id>/spec.md`
7. **Update `workflow-state.json`**: set `feature.id`, `feature.name`, `feature.reviewDepth`

## Spec Template

```markdown
# Spec: [feature name]

## Description
[What the feature does — plain language the operator can understand if translated]

## Design Reference
[If the operator mentioned a reference: what was studied, key patterns identified, what applies and what doesn't]

## Acceptance Scenarios
- [ ] [Scenario 1: expected behavior in product language, not technical]
- [ ] [Scenario 2: ...]
(aim for 5-10 scenarios covering happy path, edge cases, and error states)

## Assumed Decisions
[What the agent decided without asking — listed for review at Gate 1]
- **[Decision area]**: chose [X] because [consequence for user]. Alternative was [Y].

## Constraints
[What is NOT in scope for this feature]

## Dependencies
[Features or infrastructure required before this one]

## Review Depth
[simple | medium | complex] — [1-sentence justification]
```

## Quality Rules

- Acceptance scenarios MUST be in product language: "User can X" not "Component renders Y"
- Each scenario must be independently testable
- Assumed decisions must explain the USER CONSEQUENCE, not the technical choice
- Include at least one "empty state" scenario and one "error/edge case" scenario
- If scope is large (more than 5 features): split into smaller features
- Never ask about technology — decide and list as assumed decision

## Gate 1 Presentation (in Portuguese to operator)

Present a summary covering:
1. What you researched and key findings (if applicable)
2. What will be built (1-2 sentences)
3. Key assumed decisions and their consequences
4. What is NOT included (constraints)
5. Use the `ask` tool to present approval options to the operator:
   - "Aprovado! Pode construir assim"
   - "Quase, mas quero ajustar algumas coisas"
   - "Não é isso, vamos repensar"

Do NOT use the `interview` tool or any other form/wizard.
