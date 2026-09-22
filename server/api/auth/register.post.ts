export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string, password?: string, tenantName?: string }>(event)
  const email = assertEmail(body?.email ?? '')
  const password = assertPassword(body?.password ?? '')
  const tenantName = (body?.tenantName ?? '').trim() || '个人空间'
  const sql = useDb()

  const existing = await sql`select id from accounts where email = ${email}`
  if (existing.length > 0) {
    throw createError({ statusCode: 409, statusMessage: '该邮箱已经注册' })
  }

  const passwordHash = await hashPassword(password)
  const created = await sql.begin(async (tx) => {
    const [account] = await tx<{ id: string }[]>`
      insert into accounts (email, password_hash) values (${email}, ${passwordHash})
      returning id
    `
    const [tenant] = await tx<{ id: string }[]>`
      insert into tenants (name) values (${tenantName}) returning id
    `
    if (!account || !tenant) {
      throw createError({ statusCode: 500, statusMessage: '创建账号失败' })
    }
    await tx`
      insert into users (account_id, tenant_id, email, role)
      values (${account.id}, ${tenant.id}, ${email}, 'owner')
    `
    return { accountId: account.id, tenantId: tenant.id }
  })

  await createSession(event, created.accountId, created.tenantId)
  return { ok: true }
})
