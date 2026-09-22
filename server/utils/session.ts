import type { H3Event } from 'h3'
import { randomToken, sha256 } from './crypto'

const COOKIE_NAME = 'pm_session'
const TTL_SECONDS = 60 * 60 * 24 * 30

export interface SessionContext {
  accountId: string
  tenantId: string
  tenantName: string
  email: string
  userRole: 'owner' | 'admin' | 'member'
}

const ROLE_LEVEL = { member: 1, admin: 2, owner: 3 } as const

export async function createSession(
  event: H3Event,
  accountId: string,
  tenantId: string,
): Promise<void> {
  const token = randomToken()
  const sql = useDb()
  await sql`
    insert into sessions (token_hash, account_id, tenant_id, expires_at)
    values (${sha256(token)}, ${accountId}, ${tenantId}, now() + interval '30 days')
  `
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: !import.meta.dev,
    maxAge: TTL_SECONDS,
  })
}

export async function readSession(event: H3Event): Promise<SessionContext | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) {
    return null
  }
  const sql = useDb()
  const [row] = await sql<
    {
      account_id: string
      tenant_id: string
      tenant_name: string
      email: string
      role: SessionContext['userRole']
    }[]
  >`
    select s.account_id, s.tenant_id, t.name as tenant_name, a.email, u.role
    from sessions s
    join accounts a on a.id = s.account_id
    join tenants t on t.id = s.tenant_id
    join users u on u.account_id = s.account_id and u.tenant_id = s.tenant_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()
  `
  if (!row) {
    return null
  }
  return {
    accountId: row.account_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    email: row.email,
    userRole: row.role,
  }
}

export async function destroySession(event: H3Event): Promise<void> {
  const token = getCookie(event, COOKIE_NAME)
  if (token) {
    const sql = useDb()
    await sql`delete from sessions where token_hash = ${sha256(token)}`
  }
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

/** 当前活跃租户随会话保存,切换租户只改这条记录 */
export async function switchTenant(
  event: H3Event,
  accountId: string,
  tenantId: string,
): Promise<void> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
  const sql = useDb()
  const [row] = await sql`
    update sessions set tenant_id = ${tenantId}
    where token_hash = ${sha256(token)} and account_id = ${accountId}
    returning id
  `
  if (!row) {
    throw createError({ statusCode: 403, statusMessage: '没有该租户的访问权限' })
  }
}

export async function requireSession(event: H3Event): Promise<SessionContext> {
  const session = await readSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '未登录' })
  }
  return session
}

/** 权限不足时直接抛 403,调用方拿到的一定是有权限的会话 */
export async function requireRole(
  event: H3Event,
  minimum: keyof typeof ROLE_LEVEL,
): Promise<SessionContext> {
  const session = await requireSession(event)
  if (ROLE_LEVEL[session.userRole] < ROLE_LEVEL[minimum]) {
    throw createError({ statusCode: 403, statusMessage: '当前角色没有这个权限' })
  }
  return session
}

export async function listMemberships(accountId: string) {
  const sql = useDb()
  return sql<{ id: string, name: string, role: string }[]>`
    select t.id, t.name, u.role
    from users u
    join tenants t on t.id = u.tenant_id
    where u.account_id = ${accountId}
    order by t.created_at
  `
}
