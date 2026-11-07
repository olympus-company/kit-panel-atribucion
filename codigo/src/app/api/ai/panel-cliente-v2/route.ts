import { NextResponse } from 'next/server'
import { z } from 'zod'
import { callOpenRouter } from '@/lib/openrouter'
import { ANALISIS, REASONING_LOW, minMaxTokens } from '@/lib/llm/modelos'
import { aceptaLlavePanel, getSessionViewer } from '@/features/clientes-infra/panel-access'

const requestSchema = z.object({
  question: z.string().min(3).max(500),
  context: z.object({
    roas: z.string().optional(),
    ventas: z.number().optional(),
    noShow: z.number().optional(),
    calls: z.array(z.record(z.string(), z.unknown())).max(10).default([]),
    topKpis: z.array(z.object({ label: z.string(), value: z.string() })).max(8).default([]),
  }),
})

// Lo llama el panel de Cliente (con su llave propia en `x-panel-key`) o alguien del equipo con sesión.
export async function POST(req: Request) {
  if (!aceptaLlavePanel(req.headers.get('x-panel-key'), 'CLIENTE_PANEL_KEY') && !(await getSessionViewer())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const body = requestSchema.parse(await req.json())
  const response = await callOpenRouter(
    `Eres el asistente IA del panel comercial v2 de Cliente Ejemplo.
Responde en español chileno neutro, corto y accionable.
No inventes llamadas Fathom si el contexto trae calls vacío.
Tu objetivo es ayudar al gerente comercial a decidir qué mover hoy.`,
    `Pregunta: ${body.question}

Contexto compacto del panel:
${JSON.stringify(body.context, null, 2)}`,
    minMaxTokens(700),
    // F3 (2-oct): ANALISIS (Sonnet 5.5) — este endpoint lo consumen el dueño y el equipo comercial
    // desde el panel · calidad de la respuesta importa.
    ANALISIS,
    undefined,
    { endpoint: 'panel-cliente-v2', extraBody: REASONING_LOW },
  )

  return NextResponse.json({ answer: response })
}
