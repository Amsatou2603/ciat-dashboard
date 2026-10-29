import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FiltersProvider } from '@/features/filters/FiltersContext'
import AssistantPage from '@/pages/AssistantPage'
import { dashboardRoutes } from './fixtures'
import { mockApi, renderWithProviders, session } from './utils'

afterEach(() => vi.unstubAllGlobals())
const page = () => <FiltersProvider><Routes><Route path="/assistant" element={<AssistantPage />} /></Routes></FiltersProvider>
const answer = (over = {}) => ({ id: 1, answer: '8 projet(s) en retard sur 11 projet(s) en cours.', intent: 'late', ai_generated: false, ai_configured: false, data: {}, warning: 'Service IA non configuré : cette réponse est calculée directement par le serveur, sans modèle de langage.', disclaimer: 'x', ...over })
const base = (configured: boolean) => ({ ...session(), ...dashboardRoutes(), '/assistant/status/': { configured, disclaimer: 'Réponse générée par une IA : elle peut comporter des limites.', max_question_chars: 500 }, '/assistant/history/': { items: [] } })

describe('assistant IA', () => {
  it('annonce clairement que le service IA n\'est pas configuré', async () => {
    mockApi(base(false))
    renderWithProviders(page(), { route: '/assistant' })
    expect(await screen.findByText('Le service IA n’est pas configuré')).toBeInTheDocument()
    expect(screen.queryByText(/Réponse générée par une IA/)).not.toBeInTheDocument()
  })

  it('envoie la question avec les filtres et étiquette une réponse non générée par IA', async () => {
    const { calls } = mockApi({ ...base(false), 'POST /assistant/ask/': { body: answer() } })
    renderWithProviders(page(), { route: '/assistant?cohort=2' })
    await userEvent.type(await screen.findByLabelText('Votre question'), 'Combien de projets sont en retard ?')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la question' }))
    expect(await screen.findByText('8 projet(s) en retard sur 11 projet(s) en cours.')).toBeInTheDocument()
    expect(screen.getByText('Calculé par le serveur (sans IA)')).toBeInTheDocument()
    expect(screen.queryByText('Explication générée par IA')).not.toBeInTheDocument()
    const ask = calls.find((c) => c.path === '/assistant/ask/')
    expect(ask).toBeDefined()
  })

  it('étiquette une explication générée par IA', async () => {
    mockApi({ ...base(true), 'POST /assistant/ask/': { body: answer({ ai_generated: true, ai_configured: true, warning: null, answer: 'Huit projets sont en retard.' }) } })
    renderWithProviders(page(), { route: '/assistant' })
    expect(await screen.findByText(/peut comporter des limites/)).toBeInTheDocument()
    await userEvent.type(await screen.findByLabelText('Votre question'), 'Retards ?')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la question' }))
    expect(await screen.findByText('Explication générée par IA')).toBeInTheDocument()
  })

  it('refuse une question trop courte côté client', async () => {
    const { calls } = mockApi(base(false))
    renderWithProviders(page(), { route: '/assistant' })
    await userEvent.type(await screen.findByLabelText('Votre question'), 'a')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la question' }))
    expect(await screen.findByText('Posez une question plus précise.')).toBeInTheDocument()
    expect(calls.some((c) => c.path === '/assistant/ask/')).toBe(false)
  })

  it('affiche les erreurs du serveur (limite de débit) dans la conversation', async () => {
    mockApi({ ...base(false), 'POST /assistant/ask/': { status: 429, body: { code: 'throttled', message: 'Requête limitée.', details: null } } })
    renderWithProviders(page(), { route: '/assistant' })
    await userEvent.type(await screen.findByLabelText('Votre question'), 'Combien de projets ?')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer la question' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de questions')
  })
})
