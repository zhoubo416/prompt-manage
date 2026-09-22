export interface SessionState {
  authenticated: boolean
  email?: string
  role?: 'owner' | 'admin' | 'member'
  tenant?: { id: string, name: string }
  tenants?: { id: string, name: string, role: string }[]
}

export function useSessionState() {
  return useState<SessionState | null>('pm-session', () => null)
}

/** 会话状态在客户端缓存,登录、登出和切换租户后传 true 强制刷新 */
export async function loadSession(force = false): Promise<SessionState> {
  const state = useSessionState()
  if (state.value && !force) {
    return state.value
  }
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  try {
    state.value = await $fetch<SessionState>('/api/auth/session', { headers })
  } catch {
    state.value = { authenticated: false }
  }
  return state.value
}
