export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = await readBody<{ tenantId?: string }>(event)
  const tenantId = body?.tenantId
  if (!tenantId) {
    throw createError({ statusCode: 400, statusMessage: '缺少 tenantId' })
  }

  const sql = useDb()
  const [membership] = await sql`
    select id from users where account_id = ${session.accountId} and tenant_id = ${tenantId}
  `
  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: '没有该租户的访问权限' })
  }

  await switchTenant(event, session.accountId, tenantId)
  return { ok: true }
})
