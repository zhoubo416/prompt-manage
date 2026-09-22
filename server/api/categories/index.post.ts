export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = await readBody<{ name?: string, description?: string }>(event)
  const name = assertText(body?.name, '分类名称', 40)
  const description = (body?.description ?? '').trim().slice(0, 200)
  const sql = useDb()

  const [existing] = await sql`
    select id from categories where tenant_id = ${session.tenantId} and name = ${name}
  `
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: '分类名称已存在' })
  }

  const [row] = await sql<{ id: string }[]>`
    insert into categories (tenant_id, name, description, sort_order)
    values (
      ${session.tenantId}, ${name}, ${description},
      coalesce((select max(sort_order) + 1 from categories where tenant_id = ${session.tenantId}), 0)
    )
    returning id
  `
  if (!row) {
    throw createError({ statusCode: 500, statusMessage: '创建分类失败' })
  }
  return { id: row.id }
})
