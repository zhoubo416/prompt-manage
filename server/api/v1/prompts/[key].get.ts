import { normalizeVariables } from '#shared/template'

/**
 * 对外接口:按 Key 取最新的 Published 版本。
 * API Key 决定租户,成功返回才记一次调用。
 */
export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const key = requireParam(event, 'key')
  const token = readBearerToken(getHeader(event, 'authorization'))
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: '缺少 API Key' })
  }

  const sql = useDb()
  const [apiKey] = await sql<{ id: string, tenant_id: string, status: string }[]>`
    select id, tenant_id, status from api_keys where key_hash = ${hashApiKey(token)}
  `
  if (!apiKey || apiKey.status !== 'active') {
    throw createError({ statusCode: 401, statusMessage: 'API Key 无效或已禁用' })
  }

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
    where p.tenant_id = ${apiKey.tenant_id} and p.key = ${key}
  `
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '找不到该 Prompt 的可用版本' })
  }

  await recordUsage(sql, {
    tenantId: apiKey.tenant_id,
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
