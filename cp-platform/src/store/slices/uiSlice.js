import { localStorageApi } from '../../api/localStorageApi.js'

function getInitialTheme() {
  try {
    const stored = localStorageApi.getItem('cp-designer-theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export const createUiSlice = (set, get) => ({
  ui: {
    sidebarCollapsed: false,
    calculatingStationId: null,
    theme: getInitialTheme(),
  },

  setSidebarCollapsed: (v) =>
    set((state) => {
      state.ui.sidebarCollapsed = v
    }),

  setTheme: (theme) =>
    set((state) => {
      state.ui.theme = theme
      try {
        localStorageApi.setItem('cp-designer-theme', theme)
      } catch (_) {}
    }),

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.ui.theme === 'light' ? 'dark' : 'light'
      state.ui.theme = nextTheme
      try {
        localStorageApi.setItem('cp-designer-theme', nextTheme)
      } catch (_) {}
    }),

  setActiveWorkspace: (workspace) =>
    set((state) => {
      state.activeWorkspace = workspace
    }),
})
