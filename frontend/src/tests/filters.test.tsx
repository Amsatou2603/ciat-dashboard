import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FilterBar } from '@/features/filters/FilterBar'
import { FiltersProvider } from '@/features/filters/FiltersContext'
import { useIndicators } from '@/services/analytics'
import { dashboardRoutes } from './fixtures'
import { mockApi, renderWithProviders, session } from './utils'

afterEach(() => vi.unstubAllGlobals())
const Search = () => <p data-testid="search">{useLocation().search}</p>
function Probe() { const q = useIndicators(); return <p data-testid="ideas">{q.data ? q.data.ideas_received : '…'}</p> }
const tree = () => <FiltersProvider><Routes><Route path="/" element={<><FilterBar /><Probe /><Search /></>} /></Routes></FiltersProvider>

describe('filtres', () => {
  it('un filtre de cohorte est reflété dans l\'URL et envoyé à l\'API', async () => {
    const { calls } = mockApi({ ...session(), ...dashboardRoutes() })
    renderWithProviders(tree())
    await screen.findByRole('option', { name: 'Cohorte B' })
    await userEvent.selectOptions(screen.getByLabelText('Cohorte', { selector: '#f-cohort' }), '2')
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('cohort=2'))
    await waitFor(() => expect(calls.some((c) => c.path === '/analytics/indicators/' && c.search.includes('cohort=2'))).toBe(true))
  })

  it('combine plusieurs filtres et les réinitialise', async () => {
    mockApi({ ...session(), ...dashboardRoutes() })
    renderWithProviders(tree())
    await screen.findByRole('option', { name: 'Cohorte A' })
    await userEvent.selectOptions(screen.getByLabelText('Cohorte', { selector: '#f-cohort' }), '1')
    await userEvent.selectOptions(screen.getByLabelText('Domaine', { selector: '#f-domain' }), '1')
    await waitFor(() => expect(screen.getByTestId('search').textContent).toMatch(/cohort=1.*domain=1|domain=1.*cohort=1/))
    await userEvent.click(screen.getAllByRole('button', { name: /Réinitialiser/ })[0]!)
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''))
  })

  it('refuse une période inversée sans interroger l\'API', async () => {
    const { calls } = mockApi({ ...session(), ...dashboardRoutes() })
    renderWithProviders(tree(), { route: '/?period_start=2026-05-01&period_end=2025-01-01' })
    expect(await screen.findByRole('alert')).toHaveTextContent('La date de fin doit être postérieure')
    await new Promise((r) => setTimeout(r, 50))
    expect(calls.some((c) => c.path === '/analytics/indicators/')).toBe(false)
  })

  it('ignore les valeurs corrompues de l\'URL', async () => {
    const { calls } = mockApi({ ...session(), ...dashboardRoutes() })
    renderWithProviders(tree(), { route: '/?cohort=1;DROP&period_start=hier' })
    await waitFor(() => expect(calls.some((c) => c.path === '/analytics/indicators/')).toBe(true))
    const call = calls.find((c) => c.path === '/analytics/indicators/')!
    expect(call.search).not.toContain('DROP')
    expect(call.search).not.toContain('hier')
  })
})
