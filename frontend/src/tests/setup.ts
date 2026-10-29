import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom n'implémente pas <dialog> modal ni matchMedia ni ResizeObserver.
HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open') }
window.matchMedia = window.matchMedia || ((query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList)
window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function scrollIntoView() {}
