
const API_URL = 'http://localhost:3000'

export interface DiscordUser {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
}

export interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
}

export type Permission =
  | 'charters.view'
  | 'media.view'
  | 'organization.view'
  | 'members.view'
  | 'applications.view'
  | 'members.manage'
  | 'leadership.manage'
  | 'club.full'
  | 'website.manage'

export interface AuthStatus {
  authenticated: boolean
  user: DiscordUser | null
  roles: string[]
  roleDetails: DiscordRole[]
  permissions: Permission[]
}

const emptyAuthStatus: AuthStatus = {
  authenticated: false,
  user: null,
  roles: [],
  roleDetails: [],
  permissions: [],
}

let cachedStatus: AuthStatus = { ...emptyAuthStatus }

export async function getAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Kunde inte kontrollera inloggningsstatus.')
  }

  const data = await response.json()

  const roleDetails: DiscordRole[] = Array.isArray(data.roleDetails)
    ? data.roleDetails
        .filter((role: unknown) => {
          return (
            typeof role === 'object' &&
            role !== null &&
            'id' in role &&
            'name' in role
          )
        })
        .map((role: any) => ({
          id: String(role.id),
          name: String(role.name),
          color: Number(role.color) || 0,
          position: Number(role.position) || 0,
        }))
    : []

  const roleNames: string[] = Array.isArray(data.roles)
    ? data.roles.map((role: unknown) =>
        typeof role === 'string'
          ? role
          : String((role as { name?: string }).name ?? ''),
      ).filter(Boolean)
    : []

  cachedStatus = {
    authenticated: Boolean(data.authenticated),
    user: data.user ?? null,
    roles: roleNames.length
      ? roleNames
      : roleDetails.map(role => role.name),
    roleDetails,
    permissions: Array.isArray(data.permissions)
      ? data.permissions
      : [],
  }

  return cachedStatus
}

export function getCachedAuthStatus(): AuthStatus {
  return cachedStatus
}

export function hasPermission(permission: Permission): boolean {
  return (
    cachedStatus.permissions.includes(permission) ||
    (
      permission !== 'website.manage' &&
      cachedStatus.permissions.includes('club.full')
    )
  )
}

export function hasAnyPermission(
  permissions: Permission[],
): boolean {
  return permissions.some(hasPermission)
}

export function hasRole(role: string): boolean {
  return cachedStatus.roles.includes(role)
}

export function loginWithDiscord(): void {
  window.location.href = `${API_URL}/auth/discord`
}

export async function logoutFromDiscord(): Promise<void> {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Kunde inte logga ut.')
  }

  cachedStatus = { ...emptyAuthStatus }
}
