import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FiltersProvider } from '@/features/filters/FiltersContext'
import DashboardPage from '@/pages/DashboardPage'
import { dashboardRoutes, emptyIndicators, indicators } from './fixtures'
import { mockApi, renderWithProviders, session } from './utils'

afterEach(() => vi.unstubAllGlobals())
const page = () => <FiltersProvider><Routes><Route path="/" element={<DashboardPage />} /></Routes></FiltersProvider>

describe('tableau de bord', () => {
  it('affiche les indicateurs issus de l\'API', async () => {
    mockApi({ ...session(), ...dashboardRoutes() })
    renderWithProviders(page())
    const kpis = await screen.findByRole('region', { name: 'Indicateurs clés' })
    expect(await within(kpis).findByText('45,2 % des idées')).toBeInTheDocument()
    expect(within(kpis).getByText('59,6 %')).toBeInTheDocument()
    expect(within(kpis).getByText('32 M XOF')).toBeInTheDocument()
    expect(await screen.findByText(/projet\(s\) en retard/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Capteurs d'humidité/ })).toHaveAttribute('href', '/projets/9')
  })

  it('affiche les candidatures agrégées des cohortes quand elles sont applicables', async () => {
    mockApi({ ...session(), ...dashboardRoutes({ ...indicators, cohort_aggregates: { applicable: true, applications: 290, selections: 77, selection_rate_pct: 26.6, cohorts: 4 } }) })
    renderWithProviders(page())
    expect(await screen.findByText('Candidatures reçues')).toBeInTheDocument()
    expect(screen.getByText('290')).toBeInTheDocument()
    expect(screen.getByText(/agrégat des cohortes/)).toBeInTheDocument()
  })

  it('explique pourquoi les agrégats ne s\'appliquent pas quand un filtre les rend non ventilables', async () => {
    mockApi({ ...session(), ...dashboardRoutes({ ...indicators, cohort_aggregates: { applicable: false, reason: 'Les candidatures agrégées ne sont pas ventilées par période, domaine, statut ou porteur.' } }) })
    renderWithProviders(page())
    expect(await screen.findByText(/ne sont pas ventilées/)).toBeInTheDocument()
    expect(screen.getByText('Idées reçues')).toBeInTheDocument()
  })

  it('signale les données fictives de démonstration', async () => {
    mockApi({ ...session(), ...dashboardRoutes() })
    renderWithProviders(page())
    expect(await screen.findByText('Données fictives de démonstration.')).toBeInTheDocument()
  })

  it('affiche des états vides explicites, sans inventer de valeurs', async () => {
    mockApi({ ...session(), ...dashboardRoutes(emptyIndicators) })
    renderWithProviders(page())
    expect(await screen.findByText('Aucune idée reçue sur cette période')).toBeInTheDocument()
    expect((await screen.findAllByText('Aucun financement enregistré')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Aucun projet en cours n’est en retard.')).toBeInTheDocument()
    const kpis = screen.getByRole('region', { name: 'Indicateurs clés' })
    expect(await within(kpis).findAllByText('n/d')).not.toHaveLength(0)
  })

  it('montre une erreur avec bouton Réessayer quand l\'API échoue', async () => {
    mockApi({ ...session(), ...dashboardRoutes(), '/analytics/timeseries/': { status: 500, body: { code: 'error', message: 'Le serveur a rencontré une erreur.', details: null } } })
    renderWithProviders(page())
    expect(await screen.findByText('Impossible de charger ces données')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Réessayer/ }).length).toBeGreaterThan(0)
  })

  it('affiche l\'état de chargement avant les données', async () => {
    mockApi({ ...session(), ...dashboardRoutes() })
    const { container } = renderWithProviders(page())
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0) // avant l'arrivée des données
    expect(await screen.findByText('45,2 % des idées')).toBeInTheDocument()
    expect(container.querySelectorAll('.skeleton').length).toBeLessThan(3)
  })

  it('masque l\'assistant et l\'export sans les droits correspondants', async () => {
    mockApi({ ...session({ id: 2, username: 'lecteur', first_name: '', last_name: '', email: null, role: 'reader', role_label: 'Lecteur', capabilities: ['view_dashboard', 'view_projects'] }), ...dashboardRoutes() })
    renderWithProviders(page())
    await screen.findByRole('region', { name: 'Indicateurs clés' })
    expect(screen.queryByRole('link', { name: /Assistant IA/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Exporter/ })).not.toBeInTheDocument()
  })
})
