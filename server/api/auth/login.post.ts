export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string }>(event)
  const email = assertEmail(body?.email ?? '')
  const password = assertPassword(body?.password ?? '')
  const sql = useDb()

  const [account] = await sql<{ id: string, password_hash: string }[]>`
    select id, password_hash from accounts where email = ${email}
  `
  const matched = account ? await verifyPassword(password, account.password_hash) : false
  if (!account || !matched) {
    throw createError({ statusCode: 401, statusMessage: '邮箱或密码不正确' })
  }

  const [membership] = await sql<{ tenant_id: string }[]>`
    select tenant_id from users where account_id = ${account.id} order by created_at limit 1
  `
  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: '该账号还没有可用的租户' })
  }

  await createSession(event, account.id, membership.tenant_id)
  return { ok: true }
})
