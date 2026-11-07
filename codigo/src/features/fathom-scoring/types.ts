import { z } from 'zod'

export const fathomOutcomeSchema = z.enum(['ganada', 'perdida', 'no-show', 'pendiente'])
export const fathomTierSchema = z.enum(['plan_a', 'plan_b', 'plan_c', 'plan_d']).nullable()

export const fathomScoringContextSchema = z.object({
  clientName: z.string(),
  closerName: z.string().nullable(),
  gatillos: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
})

export const fathomScoringResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  outcome: fathomOutcomeSchema,
  tier_quoted: fathomTierSchema,
  trigger_arrival: z.string().nullable(),
  trigger_outcome: z.string().nullable(),
  objection_main: z.string().nullable(),
  talk_ratio_closer: z.number().int().min(0).max(100).nullable(),
  questions_count: z.number().int().min(0).nullable(),
  price_mentioned_min: z.number().int().min(0).nullable(),
  cases_mentioned: z.number().int().min(0).nullable(),
  silences_count: z.number().int().min(0).nullable(),
  ai_recommendation: z.string(),
  matched_gatillo: z.string().nullable(),
  matched_objection: z.string().nullable(),
})

export type FathomScoringContext = z.infer<typeof fathomScoringContextSchema>
export type FathomScoringResult = z.infer<typeof fathomScoringResultSchema>
