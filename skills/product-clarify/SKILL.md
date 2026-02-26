---
name: product-clarify
description: "Generate clarification questions about product behavior. Only questions about what the product should DO, never about technology."
---

# Product Clarify Skill

## Absolute Rules

- Questions ONLY about behavior, never about technology
  ✓ "When the item is purchased, does it disappear from the list or stay crossed out?"
  ✗ "Should I use localStorage or IndexedDB to persist items?"
- Maximum 3-5 questions per round
- If the answer could be "either one is fine": don't ask — decide and list as assumed decision
- If the ambiguity doesn't affect user-perceived behavior: don't ask — decide

## Process

1. Analyze the operator's description and identify ambiguities
2. Filter: only ambiguities that AFFECT user-perceived behavior
3. Prioritize: questions whose answers change features or acceptance scenarios
4. Formulate questions in product language, not technical
5. Ask naturally in Portuguese in the chat — wait for the operator's response

## How to Ask

Write questions naturally in the conversation **in Brazilian Portuguese**. Be conversational, not robotic.

Example:
"Antes de eu montar a especificação, preciso entender melhor algumas coisas:

1. Quando alguém visita o blog, o que deveria ver primeiro — o último post em destaque ou uma lista simples de todos os posts?
2. O blog vai ter uma página "Sobre" com sua bio, ou só os posts?
3. Você quer poder organizar posts por tema/categoria, ou uma lista cronológica é suficiente por agora?"

## When NOT to Clarify

Skip clarification entirely if:
- The operator already gave very detailed requirements that leave no behavioral ambiguity
- All remaining ambiguities are about implementation details (not behavior)

This is rare. When in doubt, ask.
