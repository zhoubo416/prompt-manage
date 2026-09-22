/** 对外接口:修改 Prompt 元信息,正文走保存版本接口 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event, { write: true })
  const promptKey = requireParam(event, 'key')
  const body = await readBody<{
    name?: string
    description?: string
    categoryId?: string
    categoryName?: string
  }>(event)
  const sql = useDb()

  const [prompt] = await sql<{ id: string }[]>`
    select id from prompts where tenant_id = ${apiKey.tenantId} and key = ${promptKey}
  `
  if (!prompt) {
    apiError('not_found', 'Prompt 不存在')
  }

  const patch: Record<string, unknown> = {}
  if (body?.name !== undefined) {
    patch.name = assertText(body.name, 'Prompt 名称', 100)
  }
  if (body?.description !== undefined) {
    patch.description = String(body.description).trim().slice(0, 500)
  }
  if (body?.categoryId !== undefined || body?.categoryName !== undefined) {
    patch.category_id = await resolveCategoryId(sql, apiKey.tenantId, {
      categoryId: body?.categoryId,
      categoryName: body?.categoryName,
    })
  }

  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date()
    await sql`
      update prompts set ${sql(patch)}
      where id = ${prompt.id} and tenant_id = ${apiKey.tenantId}
    `
  }

  const updated = await fetchPromptSummary(sql, apiKey.tenantId, promptKey)
  if (!updated) {
    apiError('internal_error', '更新 Prompt 失败')
  }
  return { prompt: updated }
})
