/**
 * setupTests.js
 *
 * Vitest setup file. Loaded before every test. Registers @testing-library/jest-dom
 * matchers (toBeInTheDocument, toHaveTextContent, etc.) and configures auto-cleanup
 * so each render() is torn down before the next test.
 */

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto-unmount all components after each test to prevent test pollution
// (especially important under React StrictMode + jsdom)
afterEach(() => {
  cleanup()
})
