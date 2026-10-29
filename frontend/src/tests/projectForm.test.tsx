import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectFormDialog } from '@/components/ProjectFormDialog'
import { options } from './fixtures'
import { mockApi, renderWithProviders, session } from './utils'

afterEach(() => vi.unstubAllGlobals())
const base = { ...session(), '/analytics/filter-options/': options, '/porteurs/': { count: 1, next: null, previous: null, results: [{ id: 7, full_name: 'Awa T.', gender: 'F', projects_count: 0 }] } }

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: 'Cohorte A' }); await screen.findByRole('option', { name: 'Awa T.' })
  await user.type(screen.getByLabelText('Titre du projet'), 'Séchoir solaire')
  await user.selectOptions(screen.getByLabelText('Cohorte'), '1')
  await user.selectOptions(screen.getByLabelText('Domaine d’application'), '1')
  await user.selectOptions(screen.getByLabelText('Porteur de projet'), '7')
}

describe('formulaire projet', () => {
  it('affiche les erreurs de validation sans appeler le serveur', async () => {
    const { calls } = mockApi(base)
    renderWithProviders(<ProjectFormDialog open onClose={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Le titre doit contenir au moins 3 caractères.')).toBeInTheDocument()
    expect(screen.getByText('Choisissez une cohorte.')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/projects/')).toBe(false)
  })

  it('enregistre un projet valide et ferme la fenêtre', async () => {
    const onClose = vi.fn()
    const { calls } = mockApi({ ...base, 'POST /projects/': { status: 201, body: { id: 1 } } })
    const user = userEvent.setup()
    renderWithProviders(<ProjectFormDialog open onClose={onClose} />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const post = calls.find((c) => c.method === 'POST' && c.path === '/projects/')
    expect(post).toBeDefined()
  })

  it('rattache les erreurs serveur au bon champ', async () => {
    mockApi({ ...base, 'POST /projects/': { status: 400, body: { code: 'validation_error', message: 'x', details: { deadline: ['La date limite doit être postérieure à la date de début.'] } } } })
    const user = userEvent.setup()
    renderWithProviders(<ProjectFormDialog open onClose={() => {}} />)
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('La date limite doit être postérieure à la date de début.')).toBeInTheDocument()
  })

  it('refuse un projet terminé à moins de 100 % (règle miroir du serveur)', async () => {
    mockApi(base)
    const user = userEvent.setup()
    renderWithProviders(<ProjectFormDialog open onClose={() => {}} />)
    await fill(user)
    await user.selectOptions(screen.getByLabelText('Statut'), 'TERMINE')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Un projet terminé doit être à 100 %.')).toBeInTheDocument()
  })
})
