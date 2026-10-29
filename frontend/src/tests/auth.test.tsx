import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import { anonymous, makeUser, mockApi, renderWithProviders, session } from './utils'

afterEach(() => vi.unstubAllGlobals())
const Where = () => <p data-testid="where">{useLocation().pathname}</p>

function Tree() {
  return (
    <Routes>
      <Route path="/connexion" element={<><LoginPage /><Where /></>} />
      <Route element={<ProtectedRoute />}><Route path="/" element={<><h1>Accueil privé</h1><Where /></>} /></Route>
      <Route element={<ProtectedRoute requires="manage_users" />}><Route path="/utilisateurs" element={<h1>Admin</h1>} /></Route>
      <Route path="/acces-refuse" element={<h1>Accès non autorisé</h1>} />
    </Routes>
  )
}

describe('navigation protégée', () => {
  it('redirige un visiteur anonyme vers la connexion', async () => {
    mockApi(anonymous())
    renderWithProviders(<Tree />, { route: '/' })
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeInTheDocument()
    expect(screen.getByTestId('where')).toHaveTextContent('/connexion')
  })
  it('laisse passer un utilisateur connecté', async () => {
    mockApi(session())
    renderWithProviders(<Tree />, { route: '/' })
    expect(await screen.findByRole('heading', { name: 'Accueil privé' })).toBeInTheDocument()
  })
  it('refuse une page dont le rôle ne suffit pas', async () => {
    mockApi(session(makeUser('reader', ['view_dashboard'])))
    renderWithProviders(<Tree />, { route: '/utilisateurs' })
    expect(await screen.findByRole('heading', { name: 'Accès non autorisé' })).toBeInTheDocument()
  })
})

describe('formulaire de connexion', () => {
  it('signale les champs vides sans appeler le serveur', async () => {
    const { calls } = mockApi(anonymous())
    renderWithProviders(<Tree />, { route: '/connexion' })
    await userEvent.click(await screen.findByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByText('Saisissez votre identifiant.')).toBeInTheDocument()
    expect(screen.getByText('Saisissez votre mot de passe.')).toBeInTheDocument()
    expect(calls.some((c) => c.path === '/auth/login/')).toBe(false)
  })
  it('affiche une alerte claire si les identifiants sont refusés', async () => {
    mockApi({ ...anonymous(), 'POST /auth/login/': { status: 401, body: { code: 'invalid_credentials', message: 'Identifiant ou mot de passe incorrect.', details: null } } })
    renderWithProviders(<Tree />, { route: '/connexion' })
    await userEvent.type(await screen.findByLabelText('Identifiant'), 'amsatou')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Identifiant ou mot de passe incorrect.')
  })
  it('connecte puis redirige vers la page demandée', async () => {
    mockApi({ ...anonymous(), 'POST /auth/login/': { body: { access: 'tok', user: makeUser() } } })
    renderWithProviders(<Tree />, { route: '/connexion' })
    await userEvent.type(await screen.findByLabelText('Identifiant'), 'amsatou')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'Mot-de-passe-42')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/'))
    expect(await screen.findByRole('heading', { name: 'Accueil privé' })).toBeInTheDocument()
  })
  it('affiche le verrouillage temporaire (429)', async () => {
    mockApi({ ...anonymous(), 'POST /auth/login/': { status: 429, body: { code: 'account_locked', message: 'Trop de tentatives échouées. Réessayez dans quelques minutes.', details: null } } })
    renderWithProviders(<Tree />, { route: '/connexion' })
    await userEvent.type(await screen.findByLabelText('Identifiant'), 'amsatou')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de tentatives');
  })
})
