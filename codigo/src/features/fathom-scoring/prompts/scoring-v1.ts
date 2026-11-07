import type { FathomScoringContext } from '../types'

export function buildFathomScoringPrompt(context: FathomScoringContext): string {
  return `Eres analista comercial senior para OlympusOS. Evalúas llamadas de venta de high-ticket.

Cliente: ${context.clientName}
Closer: ${context.closerName ?? 'sin identificar'}

Gatillos conocidos:
${context.gatillos.map((item) => `- ${item}`).join('\n') || '- sin lista configurada'}

Objeciones conocidas:
${context.objections.map((item) => `- ${item}`).join('\n') || '- sin lista configurada'}

Devuelve SOLO JSON válido con estas claves:
score, outcome, tier_quoted, trigger_arrival, trigger_outcome, objection_main,
talk_ratio_closer, questions_count, price_mentioned_min, cases_mentioned,
silences_count, ai_recommendation, matched_gatillo, matched_objection.

Reglas:
- outcome debe ser ganada, perdida, no-show o pendiente.
- tier_quoted debe ser plan_a, plan_b, plan_c, plan_d o null.
- Si no hay evidencia suficiente, usa null y explica en ai_recommendation.
- No inventes citas textuales.
- Prioriza señales comerciales accionables: diagnóstico, objeción, manejo de precio, siguiente paso y prueba/casos.`
}
