import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { graphGet, leerCuentaMeta, tokenMeta, type Fetcher } from './graph'

const respuesta = (cuerpo: unknown, ok = true, status = 200) => ({ ok, status, json: async () => cuerpo }) as Response

describe('Graph API · solo GET', () => {
  it('todas las llamadas son GET, con el token en el encabezado y no en la URL', async () => {
    const f = vi.fn<Fetcher>(async (url) => respuesta(url.includes('/insights') ? { data: [{ ad_id: '1', date_start: '2026-10-30', spend: '10' }] } : { data: [] }))
    const datos = await leerCuentaMeta('1234567890', 'TOKEN_SECRETO', '2026-10-19', '2026-11-01', f)
    expect(datos.filas).toHaveLength(1)
    expect(f).toHaveBeenCalledTimes(3)
    for (const [url, init] of f.mock.calls) {
      expect(init.method).toBe('GET')
      expect(init.headers.Authorization).toBe('Bearer TOKEN_SECRETO')
      expect(url).not.toContain('TOKEN_SECRETO')
      expect(url).toContain('/act_1234567890/')
    }
    expect(f.mock.calls[0][0]).toContain('time_increment=1')
    expect(f.mock.calls[0][0]).toContain('level=ad')
  })

  it('sigue la paginación y marca aprendizaje solo con status LEARNING', async () => {
    const f = vi.fn<Fetcher>()
      .mockResolvedValueOnce(respuesta({ data: [{ id: 'a' }], paging: { next: 'https://graph.facebook.com/v21.0/p2' } }))
      .mockResolvedValueOnce(respuesta({ data: [{ id: 'b' }] }))
    expect(await graphGet('x', {}, 't', z.object({ id: z.string() }), f)).toEqual([{ id: 'a' }, { id: 'b' }])
    const g = vi.fn<Fetcher>(async (url) => respuesta(url.includes('/adsets') ? { data: [{ id: 'S1', learning_stage_info: { status: 'LEARNING' } }, { id: 'S2', learning_stage_info: { status: 'SUCCESS' } }] } : { data: [] }))
    const datos = await leerCuentaMeta('act_1', 't', '2026-10-19', '2026-11-01', g)
    expect(datos.conjuntos.map((c) => c.aprendizaje)).toEqual([true, false])
  })

  it('un error de Meta se informa sin mostrar el token', async () => {
    const f = vi.fn<Fetcher>(async () => respuesta({ error: { message: 'Token vencido' } }, false, 400))
    await expect(graphGet('act_1/insights', {}, 'TOKEN_SECRETO', z.object({}), f)).rejects.toThrow('Token vencido')
  })

  it('el código del lector no contiene ninguna llamada de escritura a Meta', () => {
    const dir = path.dirname(new URL(import.meta.url).pathname)
    const fuentes = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.fixture.ts'))
    for (const f of fuentes) {
      const src = readFileSync(path.join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/method:\s*['"](POST|DELETE|PUT|PATCH)['"]/)
    }
    expect(readFileSync(path.join(dir, 'graph.ts'), 'utf8')).toMatch(/method: 'GET'/)
  })

  it('el token es el de sistema; si no hay, el propio de la cuenta (nunca el marcador system_user)', () => {
    const antes = process.env.META_SYSTEM_USER_TOKEN
    process.env.META_SYSTEM_USER_TOKEN = 'SISTEMA'
    expect(tokenMeta('propio')).toBe('SISTEMA')
    delete process.env.META_SYSTEM_USER_TOKEN
    expect(tokenMeta('propio')).toBe('propio')
    expect(tokenMeta('system_user')).toBeNull()
    if (antes) process.env.META_SYSTEM_USER_TOKEN = antes
  })
})
