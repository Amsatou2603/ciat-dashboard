import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from '@/components/Logo'
import { AppShell } from '@/layouts/AppShell'
import LoginPage from '@/pages/LoginPage'
import { anonymous, mockApi, renderWithProviders, session } from './utils'

describe('Composant Logo CIAT', () => {
  it('rend la variante horizontale avec les images claire et sombre', () => {
    const { container } = render(<Logo variant="horizontal" />)
    const images = container.querySelectorAll('img')
    expect(images.length).toBe(2)
    expect(images[0]).toHaveAttribute('src', '/ciat-logo-horizontal.png')
    expect(images[1]).toHaveAttribute('src', '/ciat-logo-horizontal-dark.png')
  })

  it('rend la variante verticale avec les images claire et sombre', () => {
    const { container } = render(<Logo variant="vertical" />)
    const images = container.querySelectorAll('img')
    expect(images.length).toBe(2)
    expect(images[0]).toHaveAttribute('src', '/ciat-logo-vertical.png')
    expect(images[1]).toHaveAttribute('src', '/ciat-logo-vertical-dark.png')
  })

  it('rend la variante emblème avec les images claire et sombre', () => {
    const { container } = render(<Logo variant="emblem" />)
    const images = container.querySelectorAll('img')
    expect(images.length).toBe(2)
    expect(images[0]).toHaveAttribute('src', '/ciat-logo-emblem.png')
    expect(images[1]).toHaveAttribute('src', '/ciat-logo-emblem-dark.png')
  })

  it('intègre le logo horizontal sur la page de connexion', () => {
    mockApi(anonymous())
    const { container } = renderWithProviders(<LoginPage />, { route: '/connexion' })
    const horizontalLogo = container.querySelector('img[src="/ciat-logo-horizontal.png"]')
    expect(horizontalLogo).toBeInTheDocument()
  })

  it('intègre le logo vertical dans la barre latérale de l\'application', async () => {
    mockApi(session())
    const { container } = renderWithProviders(<AppShell />, { route: '/' })
    const verticalLogo = container.querySelector('aside img[src="/ciat-logo-vertical.png"]')
    expect(verticalLogo).toBeInTheDocument()
  })
})
