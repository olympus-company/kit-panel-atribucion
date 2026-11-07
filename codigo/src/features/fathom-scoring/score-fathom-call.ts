import { callOpenRouter } from '@/lib/openrouter'
import { ANALISIS, REASONING_LOW, minMaxTokens } from '@/lib/llm/modelos'
import { buildFathomScoringPrompt } from './prompts/scoring-v1'
import { fathomScoringContextSchema, fathomScoringResultSchema, type FathomScoringContext, type FathomScoringResult } from './types'

export async function scoreFathomTranscript(
  transcript: string,
  context: FathomScoringContext,
): Promise<FathomScoringResult> {
  const parsedContext = fathomScoringContextSchema.parse(context)
  const content = await callOpenRouter(
    buildFathomScoringPrompt(parsedContext),
    `Transcripción:\n\n${transcript.slice(0, 60000)}`,
    minMaxTokens(1400),
    ANALISIS,
    { type: 'json_object' },
    { endpoint: 'fathom-scoring', extraBody: REASONING_LOW },
  )

  return fathomScoringResultSchema.parse(JSON.parse(content))
}
