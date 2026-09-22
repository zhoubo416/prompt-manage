export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = requireParam(event, 'id')
  const body = await readBody<{
    name?: string
    categoryId?: string
    description?: string
    key?: string
  }>(event)
  const sql = useDb()

  const [prompt] = await sql`
    select id, key from prompts where id = ${id} and tenant_id = ${session.tenantId}
  `
  if (!prompt) {
    throw createError({ statusCode: 404, statusMessage: 'Prompt 不存在' })
  }

  const patch: Record<string, unknown> = {}
  if (body?.name !== undefined) {
    patch.name = assertText(body.name, 'Prompt 名称', 100)
  }
  if (body?.description !== undefined) {
    patch.description = String(body.description).trim().slice(0, 500)
  }
  if (body?.categoryId !== undefined) {
    const categoryId = assertText(body.categoryId, '分类', 64)
    const [category] = await sql`
      select id from categories where id = ${categoryId} and tenant_id = ${session.tenantId}
    `
    if (!category) {
      throw createError({ statusCode: 400, statusMessage: '分类不存在' })
    }
    patch.category_id = categoryId
  }
  if (body?.key !== undefined) {
    const key = assertPromptKey(body.key)
    if (key !== prompt.key) {
      const [clash] = await sql`
        select id from prompts where tenant_id = ${session.tenantId} and key = ${key} and id <> ${id}
      `
      if (clash) {
        throw createError({ statusCode: 409, statusMessage: `Key "${key}" 在当前租户下已存在` })
      }
      patch.key = key
    }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true }
  }

  patch.updated_at = new Date()
  await sql`
    update prompts set ${sql(patch)} where id = ${id} and tenant_id = ${session.tenantId}
  `
  return { ok: true }
})
