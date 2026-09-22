import { mergeVariables } from '#shared/template'

/** 对外接口:新建 Prompt,可以直接发布 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event, { write: true })
  const body = await readBody<{
    name?: string
    key?: string
    categoryId?: string
    categoryName?: string
    description?: string
    content?: string
    variables?: { name: string, required?: boolean, description?: string }[]
    publish?: boolean
  }>(event)

  const name = assertText(body?.name, 'Prompt 名称', 100)
  const promptKey = assertPromptKey(body?.key ?? '')
  const content = assertText(body?.content, 'Prompt 正文', 20000)
  const description = (body?.description ?? '').trim().slice(0, 500)
  const publish = body?.publish === true
  const variables = mergeVariables(content, body?.variables ?? [])
  const sql = useDb()

  const categoryId = await resolveCategoryId(sql, apiKey.tenantId, {
    categoryId: body?.categoryId,
    categoryName: body?.categoryName,
  })

  const [clash] = await sql`
    select id from prompts where tenant_id = ${apiKey.tenantId} and key = ${promptKey}
  `
  if (clash) {
    apiError('conflict', `Key "${promptKey}" 在当前租户下已存在`)
  }

  await sql.begin(async (tx) => {
    const [prompt] = await tx<{ id: string }[]>`
      insert into prompts (tenant_id, category_id, name, key, description)
      values (${apiKey.tenantId}, ${categoryId}, ${name}, ${promptKey}, ${description})
      returning id
    `
    if (!prompt) {
      apiError('internal_error', '创建 Prompt 失败')
    }
    await tx`
      insert into prompt_versions (prompt_id, version, content, variables, status)
      values (${prompt.id}, 1, ${content}, ${toJson(tx, variables)},
              ${publish ? 'published' : 'draft'})
    `
    if (publish) {
      await tx`update prompts set current_version = 1 where id = ${prompt.id}`
    }
  })

  const prompt = await fetchPromptSummary(sql, apiKey.tenantId, promptKey)
  if (!prompt) {
    apiError('internal_error', '创建 Prompt 失败')
  }
  return {
    prompt,
    version: 1,
    status: publish ? 'published' : 'draft',
  }
})
