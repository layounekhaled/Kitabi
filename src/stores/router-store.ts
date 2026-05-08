'use client'

import { create } from 'zustand'

export type PageName =
  | 'home'
  | 'catalog'
  | 'bookDetail'
  | 'cart'
  | 'checkout'
  | 'orderSuccess'
  | 'admin'
  | 'adminBooks'
  | 'adminOrders'
  | 'adminCategories'
  | 'adminImport'
  | 'adminSocial'
  | 'adminLogin'

interface RouterState {
  currentPage: PageName
  params: Record<string, string>
  navigate: (page: PageName, params?: Record<string, string>) => void
  goBack: () => void
  history: Array<{ page: PageName; params: Record<string, string> }>
}

function readURLParams(): { page: PageName; params: Record<string, string> } {
  if (typeof window === 'undefined') {
    return { page: 'home', params: {} }
  }
  const searchParams = new URLSearchParams(window.location.search)
  const page = (searchParams.get('page') as PageName) || 'home'
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key !== 'page') {
      params[key] = value
    }
  })
  return { page, params }
}

function writeURLParams(page: PageName, params?: Record<string, string>) {
  if (typeof window === 'undefined') return
  const searchParams = new URLSearchParams()
  searchParams.set('page', page)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value)
      }
    })
  }
  const newUrl = `${window.location.pathname}?${searchParams.toString()}`
  window.history.pushState({}, '', newUrl)
}

export const useRouterStore = create<RouterState>()((set, get) => ({
  currentPage: 'home',
  params: {},
  history: [],

  navigate: (page: PageName, params?: Record<string, string>) => {
    const current = { page: get().currentPage, params: { ...get().params } }
    set({
      currentPage: page,
      params: params || {},
      history: [...get().history, current],
    })
    writeURLParams(page, params)
    // Scroll to top on navigation
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  },

  goBack: () => {
    const history = get().history
    if (history.length > 0) {
      const previous = history[history.length - 1]
      set({
        currentPage: previous.page,
        params: previous.params,
        history: history.slice(0, -1),
      })
      writeURLParams(previous.page, previous.params)
    } else {
      set({ currentPage: 'home', params: {} })
      writeURLParams('home')
    }
  },
}))

// Initialize from URL on first load (client-side only)
if (typeof window !== 'undefined') {
  const { page, params } = readURLParams()
  // Use replaceState so we don't add to browser history on initial load
  useRouterStore.setState({ currentPage: page, params })
}

// Listen for browser back/forward
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const { page, params } = readURLParams()
    useRouterStore.setState({ currentPage: page, params, history: [] })
  })
}
