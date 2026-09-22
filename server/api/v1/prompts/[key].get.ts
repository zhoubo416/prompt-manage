import { normalizeVariables } from '#shared/template'

/**
 * 对外接口:按 Key 取最新的 Published 版本。
 * API Key 决定租户,成功返回才记一次调用。
 */
export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const promptKey = requireParam(event, 'key')
  const apiKey = await requireApiKey(event)
  const sql = useDb()

  const [row] = await sql<{
    id: string
    name: string
    key: string
    version: number
    content: string
    variables: unknown
  }[]>`
    select p.id, p.name, p.key, v.version, v.content, v.variables
    from prompts p
    join prompt_versions v on v.prompt_id = p.id and v.status = 'published'
    where p.tenant_id = ${apiKey.tenantId} and p.key = ${promptKey}
  `
  if (!row) {
    apiError('not_found', '找不到该 Prompt 的可用版本')
  }

  await recordUsage(sql, {
    tenantId: apiKey.tenantId,
    promptId: row.id,
    version: row.version,
    apiKeyId: apiKey.id,
    latency: Date.now() - startedAt,
  })

  return {
    key: row.key,
    name: row.name,
    version: row.version,
    template: row.content,
    variables: normalizeVariables(row.variables),
  }
})
