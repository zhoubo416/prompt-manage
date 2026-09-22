import { mergeVariables } from '#shared/template'

export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const body = await readBody<{
    name?: string
    key?: string
    categoryId?: string
    description?: string
    content?: string
    variables?: { name: string, required?: boolean, description?: string }[]
    publish?: boolean
  }>(event)

  const name = assertText(body?.name, 'Prompt 名称', 100)
  const key = assertPromptKey(body?.key ?? '')
  const categoryId = assertText(body?.categoryId, '分类', 64)
  const description = (body?.description ?? '').trim().slice(0, 500)
  const content = assertText(body?.content, 'Prompt 正文', 20000)
  const publish = body?.publish === true
  const variables = mergeVariables(content, body?.variables ?? [])
  const sql = useDb()

  const [category] = await sql`
    select id from categories where id = ${categoryId} and tenant_id = ${session.tenantId}
  `
  if (!category) {
    throw createError({ statusCode: 400, statusMessage: '分类不存在' })
  }

  const [clash] = await sql`
    select id from prompts where tenant_id = ${session.tenantId} and key = ${key}
  `
  if (clash) {
    throw createError({ statusCode: 409, statusMessage: `Key "${key}" 在当前租户下已存在` })
  }

  const created = await sql.begin(async (tx) => {
    const [user] = await tx<{ id: string }[]>`
      select id from users where account_id = ${session.accountId} and tenant_id = ${session.tenantId}
    `
    const [prompt] = await tx<{ id: string }[]>`
      insert into prompts (tenant_id, category_id, name, key, description, created_by)
      values (${session.tenantId}, ${categoryId}, ${name}, ${key}, ${description}, ${user?.id ?? null})
      returning id
    `
    if (!prompt) {
      throw createError({ statusCode: 500, statusMessage: '创建 Prompt 失败' })
    }
    await tx`
      insert into prompt_versions (prompt_id, version, content, variables, status, created_by)
      values (${prompt.id}, 1, ${content}, ${toJson(tx, variables)},
              ${publish ? 'published' : 'draft'}, ${user?.id ?? null})
    `
    if (publish) {
      await tx`update prompts set current_version = 1 where id = ${prompt.id}`
    }
    return { id: prompt.id }
  })

  return { id: created.id, version: 1, published: publish }
})
