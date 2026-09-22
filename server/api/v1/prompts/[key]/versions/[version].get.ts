import { normalizeVariables } from '#shared/template'

/** 对外接口:按指定版本号取 Prompt,供需要固定版本的业务使用 */
export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const key = requireParam(event, 'key')
  const version = Number(requireParam(event, 'version'))
  if (!Number.isInteger(version) || version < 1) {
    throw createError({ statusCode: 400, statusMessage: '版本号不合法' })
  }

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
    join prompt_versions v on v.prompt_id = p.id
    where p.tenant_id = ${apiKey.tenant_id} and p.key = ${key}
      and v.version = ${version} and v.status in ('published', 'archived')
  `
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '找不到该版本' })
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
