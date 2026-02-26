---
name: product-clarify
description: "Generate clarification questions about product behavior. Only questions about what the product should DO, never about technology."
---

# Product Clarify Skill

## Absolute Rules

- Questions ONLY about behavior, never about technology
  ✓ "When the item is purchased, does it disappear from the list or stay crossed out?"
  ✗ "Should I use localStorage or IndexedDB to persist items?"
- Maximum 3 questions per round (more than that confuses the operator)
- If the answer could be "either one is fine": don't ask — decide and list as assumed decision
- If the ambiguity doesn't affect user-perceived behavior: don't ask — decide

## Process

1. Analyze the generated spec and identify ambiguities
2. Filter: only ambiguities that AFFECT user-perceived behavior
3. Prioritize: questions whose answers change features or acceptance scenarios
4. Formulate questions in product language, not technical
5. Write in **natural prose** — the operator will use Ctrl+. to respond via TUI

## Output Format

Write questions naturally in the response, as part of the conversation **in Brazilian Portuguese**.
DO NOT use bullet lists — write in prose so that answer.ts extracts correctly.

Example:
"Antes de continuar, tenho algumas dúvidas sobre como o produto deve se comportar.
Quando um item da lista é marcado como comprado, ele deve desaparecer da lista ou
ficar com uma marcação visual (riscado, por exemplo)? E as listas são privadas para
cada usuário ou podem ser compartilhadas com outras pessoas?"

## When NOT to Clarify

Skip clarification entirely if:
- The product is simple enough that all ambiguities can be resolved as assumed decisions
- The operator already gave very detailed requirements
- All ambiguities are about implementation details (not behavior)

In these cases, go directly to Gate 1 with the assumed decisions clearly listed.
