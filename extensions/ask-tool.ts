import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
	// KILL SWITCH: `WORKFLOW_DISABLED=true pi` desativa esta extensão
	if (process.env.WORKFLOW_DISABLED === "true") return;

	pi.registerTool({
		name: "ask",
		label: "Ask",
		description: `Interactive tool for structured questions with selectable options.
Use at workflow gates and for any decision that needs explicit operator approval.
Options should be in Portuguese (the operator's language). The operator can always write a custom response.

Use cases:
- Gate 1: confirm brief and direction
- Gate 2: confirm plan summary (zero technology)
- Gate 3: verified product, approve release`,
		parameters: Type.Object({
			questions: Type.Array(
				Type.Object({
					id: Type.String({ description: "ID da pergunta, ex: 'gate1'" }),
					question: Type.String({ description: "Texto da pergunta em português" }),
					options: Type.Array(Type.Object({ label: Type.String() }), { minItems: 1 }),
					multi: Type.Optional(Type.Boolean({ description: "Permitir múltiplas seleções" })),
					recommended: Type.Optional(Type.Number({ description: "Índice da opção recomendada (0-based)" })),
				}),
				{ minItems: 1 }
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			// AUTO-TEST MODE: auto-selects recommended option (or first) without TUI
			if (process.env.PI_AUTO_TEST === "true") {
				const results = params.questions.map((q: any) => {
					const idx = q.recommended ?? 0;
					const selected = q.options[idx]?.label ?? q.options[0]?.label ?? "(auto)";
					return { id: q.id, selected: [selected], custom: undefined };
				});
				const text = results
					.map((r: any) => `${r.id}: ${r.selected.join(", ")} [auto-approved]`)
					.join("\n");
				return {
					content: [{ type: "text", text: `Respostas do operador (auto-test):\n${text}` }],
					details: { results },
				};
			}

			if (!ctx?.ui) {
				return {
					content: [{ type: "text", text: "Erro: ferramenta requer modo interativo" }],
					details: {},
				};
			}

			const results: Array<{ id: string; selected: string[]; custom?: string }> = [];

			for (const q of params.questions) {
				const labels = q.options.map((o) => o.label);

				if (q.multi) {
					// Multi-select com toggle de checkboxes
					const selected: string[] = [];
					let done = false;

					while (!done) {
						const opts = [
							...labels.map((l) => (selected.includes(l) ? `> ${l}` : `  ${l}`)),
							...(selected.length > 0 ? ["Confirmar seleção"] : []),
							"Escrever resposta customizada",
						];
						const choice = await ctx.ui.select(q.question, opts, {
							initialIndex: q.recommended ?? 0,
						});

						if (!choice || choice === "Confirmar seleção") {
							done = true;
							break;
						}
						if (choice === "Escrever resposta customizada") {
							const custom = await ctx.ui.input("Sua resposta:");
							results.push({ id: q.id, selected: [], custom: custom ?? "(sem resposta)" });
							done = true;
							break;
						}
						const label = choice.replace(/^[> ] {1,2}/, "");
						if (selected.includes(label)) {
							selected.splice(selected.indexOf(label), 1);
						} else {
							selected.push(label);
						}
					}

					if (!results.find((r) => r.id === q.id)) {
						results.push({ id: q.id, selected, custom: undefined });
					}
				} else {
					// Single select
					const opts = [...labels, "Escrever resposta customizada"];
					const choice = await ctx.ui.select(q.question, opts, {
						initialIndex: q.recommended ?? 0,
					});

					if (choice === "Escrever resposta customizada") {
						const custom = await ctx.ui.input("Sua resposta:");
						results.push({ id: q.id, selected: [], custom: custom ?? "(sem resposta)" });
					} else {
						results.push({
							id: q.id,
							selected: choice ? [choice] : [],
							custom: undefined,
						});
					}
				}
			}

			const text = results
				.map((r) =>
					r.custom
						? `${r.id}: "${r.custom}"`
						: r.selected.length > 0
							? `${r.id}: ${r.selected.join(", ")}`
							: `${r.id}: (cancelado)`
				)
				.join("\n");

			return {
				content: [{ type: "text", text: `Respostas do operador:\n${text}` }],
				details: { results },
			};
		},
	});
}
