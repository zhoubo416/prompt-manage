import { normalizeVariables } from '#shared/template'

/** 对外接口:版本历史,只返回元信息,正文按需通过指定版本接口取 */
export default defineEventHandler(async (event) => {
  const apiKey = await requireApiKey(event)
  const promptKey = requireParam(event, 'key')
  const sql = useDb()

  const [prompt] = await sql<{ id: string }[]>`
    select id from prompts where tenant_id = ${apiKey.tenantId} and key = ${promptKey}
  `
  if (!prompt) {
    apiError('not_found', 'Prompt 不存在')
  }

  const rows = await sql`
    select version, status, variables, created_at
    from prompt_versions where prompt_id = ${prompt.id} order by version desc
  `
  return {
    key: promptKey,
    versions: rows.map(row => ({
      version: Number(row.version),
      status: row.status as 'draft' | 'published' | 'archived',
      variables: normalizeVariables(row.variables),
      createdAt: row.created_at as Date,
    })),
  }
})
