import { describe, expect, it } from 'vitest'
import { fundingSchema, loginSchema, projectSchema } from '@/schemas'
import { formatInt, formatPct, formatXof } from '@/lib/format'

const valid = { title: 'Séchoir solaire', description: '', cohort: '1', domain: '2', subdomain: '', mentor: '', delay_days: 0, porteur: '3', received_date: '2026-01-10', status: 'RECU', start_date: '', deadline: '', progress: 0, prototype_stage: 'AUCUN', prototype_notes: '' }
const issues = (v: unknown) => { const r = projectSchema.safeParse(v); return r.success ? [] : r.error.issues.map((i) => String(i.path[0])) }

describe('validation des formulaires', () => {
  it('accepte un projet valide', () => { expect(projectSchema.safeParse(valid).success).toBe(true) })
  it.each([
    [{ title: 'ab' }, 'title'], [{ cohort: '' }, 'cohort'], [{ progress: 140 }, 'progress'], [{ progress: -3 }, 'progress'], [{ progress: 'abc' }, 'progress'],
    [{ status: 'TERMINE', progress: 60 }, 'progress'], [{ status: 'REJETE', progress: 10 }, 'progress'],
    [{ start_date: '2025-01-01' }, 'start_date'], [{ start_date: '2026-03-01', deadline: '2026-02-01' }, 'deadline'],
    [{ status: 'RECU', prototype_stage: 'MVP' }, 'prototype_stage'], [{ received_date: '10/01/2026' }, 'received_date'],
  ])('rejette %j', (override, field) => { expect(issues({ ...valid, ...override })).toContain(field) })

  it('valide la connexion et les financements', () => {
    expect(loginSchema.safeParse({ username: ' ', password: '' }).success).toBe(false)
    expect(fundingSchema.safeParse({ partner: '1', amount_xof: 0, status: 'OBTENU', date: '2026-01-01' }).success).toBe(false)
    expect(fundingSchema.safeParse({ partner: '1', amount_xof: 250000, status: 'OBTENU', date: '2026-01-01' }).success).toBe(true)
  })
})

describe('formats', () => {
  it('affiche n/d plutôt qu\'un faux zéro', () => { expect(formatPct(null)).toBe('n/d'); expect(formatPct(0)).toContain('0') })
  it('formate nombres et montants en français', () => {
    expect(formatInt(1234)).toMatch(/1\s234/)
    expect(formatXof(4_500_000, true)).toBe('4,5 M XOF')
    expect(formatXof(12_000, true)).toMatch(/12 k XOF/)
  })
})
