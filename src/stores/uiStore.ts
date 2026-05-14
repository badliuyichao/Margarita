import { create } from 'zustand'
import i18n from '../i18n/i18n'

interface UiState {
  language: string
  languageReady: boolean
  sidebarCollapsed: boolean
  setLanguage: (lang: string) => void
  toggleSidebar: () => void
}

// i18n.init() is called at module load time (src/i18n/i18n.ts),
// so it's ready before any React component renders.
const i18nReady = !!(i18n as unknown as Record<string, unknown>).isInitialized
  || typeof i18n.t === 'function'

export const useUiStore = create<UiState>((set) => ({
  language: 'zh-CN',
  languageReady: i18nReady,
  sidebarCollapsed: false,
  setLanguage: (lang: string) => {
    i18n.changeLanguage(lang)
    set({ language: lang })
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))

if (!i18nReady) {
  i18n.on('initialized', () => {
    useUiStore.setState({ languageReady: true })
  })
}
