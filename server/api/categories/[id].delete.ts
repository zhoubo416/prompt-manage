export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'admin')
  const id = requireParam(event, 'id')
  const body = await readBody<{ moveToCategoryId?: string | null }>(event)
    .catch((): { moveToCategoryId?: string | null } => ({}))
  const sql = useDb()

  const [category] = await sql`
    select id from categories where id = ${id} and tenant_id = ${session.tenantId}
  `
  if (!category) {
    throw createError({ statusCode: 404, statusMessage: '分类不存在' })
  }

  const [counted] = await sql<{ count: string }[]>`
    select count(*) as count from prompts where category_id = ${id}
  `
  const promptCount = Number(counted?.count ?? 0)
  const target = body?.moveToCategoryId ?? null

  if (promptCount > 0) {
    if (!target) {
      throw createError({
        statusCode: 409,
        statusMessage: `该分类下有 ${promptCount} 个 Prompt,请先选择要迁移到的分类`,
      })
    }
    const [destination] = await sql`
      select id from categories
      where id = ${target} and tenant_id = ${session.tenantId} and id <> ${id}
    `
    if (!destination) {
      throw createError({ statusCode: 400, statusMessage: '目标分类无效' })
    }
    await sql.begin(async (tx) => {
      await tx`update prompts set category_id = ${target}, updated_at = now() where category_id = ${id}`
      await tx`delete from categories where id = ${id} and tenant_id = ${session.tenantId}`
    })
  } else {
    await sql`delete from categories where id = ${id} and tenant_id = ${session.tenantId}`
  }

  return { ok: true, movedPrompts: promptCount }
})
