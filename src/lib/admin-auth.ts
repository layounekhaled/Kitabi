'use client'

const ADMIN_TOKEN_KEY = 'kitabi-admin-token'
const ADMIN_INFO_KEY = 'kitabi-admin-info'
const ADMIN_AUTH_TOKEN = 'kitabi-admin-token'

export interface AdminInfo {
  id: string
  email: string
  name: string
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function getAdminInfo(): AdminInfo | null {
  if (typeof window === 'undefined') return null
  const info = localStorage.getItem(ADMIN_INFO_KEY)
  if (!info) return null
  try {
    return JSON.parse(info) as AdminInfo
  } catch {
    return null
  }
}

export function setAdminInfo(admin: AdminInfo): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin))
}

export function isAdminLoggedIn(): boolean {
  return !!getAdminToken() && !!getAdminInfo()
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_INFO_KEY)
}

export function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-admin-token': ADMIN_AUTH_TOKEN,
  }
}
