/**
 * 管理后台的保存/发布入口,写入规则和对外接口共用 server/utils/versioning.ts。
 */
export default defineEventHandler(async (event) => {
  const session = await requireSession(event)
  const id = requireParam(event, 'id')
  const body = await readBody<{
    content?: string
    variables?: { name: string, required?: boolean, description?: string }[]
    publish?: boolean
  }>(event)
  const sql = useDb()

  const [prompt] = await sql<{ id: string }[]>`
    select id from prompts where id = ${id} and tenant_id = ${session.tenantId}
  `
  if (!prompt) {
    businessError('not_found', 'Prompt 不存在')
  }
  const [user] = await sql<{ id: string }[]>`
    select id from users where account_id = ${session.accountId} and tenant_id = ${session.tenantId}
  `

  const result = await savePromptVersion(sql, {
    promptId: prompt.id,
    createdBy: user?.id ?? null,
    content: body?.content,
    variables: body?.variables,
    publish: body?.publish === true,
  })

  return { version: result.version, published: result.status === 'published' }
})
