import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getAccessToken, refreshSession, request, setAccessToken, toQuery } from '@/lib/api'
import { mockApi } from './utils'

afterEach(() => { vi.unstubAllGlobals(); setAccessToken(null) })

describe('client API', () => {
  it('construit la query-string sans valeurs vides', () => {
    expect(toQuery({ a: '1', b: '', c: null, d: ['x', 'y'] })).toBe('?a=1&d=x&d=y')
    expect(toQuery({})).toBe('')
  })

  it('ne stocke jamais le jeton dans localStorage / sessionStorage', async () => {
    mockApi({ 'POST /auth/refresh/': { body: { access: 'secret-access', user: {} } } })
    await refreshSession()
    expect(getAccessToken()).toBe('secret-access')
    expect(JSON.stringify({ ...localStorage })).not.toContain('secret-access')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('secret-access')
  })

  it('renouvelle la session sur 401 puis rejoue la requête une fois', async () => {
    let hits = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input), 'http://localhost').pathname
      if (path === '/api/auth/refresh/') return new Response(JSON.stringify({ access: 'new-token', user: {} }), { status: 200 })
      hits += 1
      return hits === 1 ? new Response(JSON.stringify({ code: 'not_authenticated', message: 'x', details: null }), { status: 401 }) : new Response(JSON.stringify({ ok: true }), { status: 200 })
    }))
    setAccessToken('old')
    await expect(request('/projects/')).resolves.toEqual({ ok: true })
    expect(hits).toBe(2)
    expect(getAccessToken()).toBe('new-token')
  })

  it('fusionne les rafraîchissements concurrents en une seule requête', async () => {
    const { fn } = mockApi({ 'POST /auth/refresh/': { body: { access: 't', user: {} } } })
    await Promise.all([refreshSession(), refreshSession(), refreshSession()])
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('envoie l\'en-tête anti-CSRF sur le rafraîchissement', async () => {
    const { calls } = mockApi({ 'POST /auth/refresh/': { body: { access: 't', user: {} } } })
    await refreshSession()
    expect(calls[0]?.headers.get('X-CIAT-Client')).toBe('web')
  })

  it('normalise les erreurs serveur et réseau', async () => {
    mockApi({ 'GET /x/': { status: 400, body: { code: 'validation_error', message: 'Invalide', details: { a: ['b'] } } } })
    setAccessToken('t')
    await expect(request('/x/')).rejects.toMatchObject({ status: 400, code: 'validation_error', message: 'Invalide' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fail') }))
    await expect(request('/x/')).rejects.toBeInstanceOf(ApiError)
    await expect(request('/x/')).rejects.toMatchObject({ status: 0, code: 'network' })
  })
})
