export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const id = requireParam(event, 'id')
  const sql = useDb()
  const deleted = await sql`
    delete from prompts where id = ${id} and tenant_id = ${session.tenantId} returning id
  `
  if (deleted.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Prompt 不存在' })
  }
  return { ok: true }
})
