export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = requireParam(event, 'id')
  const body = await readBody<{ name?: string, description?: string }>(event)
  const sql = useDb()

  const [current] = await sql`
    select id, name from categories where id = ${id} and tenant_id = ${session.tenantId}
  `
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: '分类不存在' })
  }

  const patch: Record<string, unknown> = {}
  if (body?.name !== undefined) {
    const name = assertText(body.name, '分类名称', 40)
    const [clash] = await sql`
      select id from categories
      where tenant_id = ${session.tenantId} and name = ${name} and id <> ${id}
    `
    if (clash) {
      throw createError({ statusCode: 409, statusMessage: '分类名称已存在' })
    }
    patch.name = name
  }
  if (body?.description !== undefined) {
    patch.description = String(body.description).trim().slice(0, 200)
  }
  if (Object.keys(patch).length === 0) {
    return { ok: true }
  }

  await sql`
    update categories set ${sql(patch)}
    where id = ${id} and tenant_id = ${session.tenantId}
  `
  return { ok: true }
})
