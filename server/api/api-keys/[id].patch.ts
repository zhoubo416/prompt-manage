export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const id = requireParam(event, 'id')
  const body = await readBody<{ status?: string }>(event)
  const status = body?.status
  if (status !== 'active' && status !== 'disabled') {
    throw createError({ statusCode: 400, statusMessage: '状态只能是 active 或 disabled' })
  }
  const sql = useDb()
  const updated = await sql`
    update api_keys set status = ${status}
    where id = ${id} and tenant_id = ${session.tenantId}
    returning id
  `
  if (updated.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'API Key 不存在' })
  }
  return { ok: true }
})
